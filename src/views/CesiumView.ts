import { 
    Viewer, 
    createWorldTerrainAsync, 
    Ion, 
    Cartesian3, 
    JulianDate, 
    Transforms, 
    Quaternion, 
    Cartographic, 
    Math as CesiumMath, 
    HeadingPitchRoll,
    CallbackProperty,
    Color,
    Cesium3DTileset,
    createWorldImageryAsync,
    SampledPositionProperty,
    ClockRange,
    HeightReference,
    Entity,
} from "cesium";
import { DroneEntity } from "../entities/DroneEntity";
import { DroneController } from "../controllers/DroneController";
import { AntennaEntity } from "../entities/AntennaEntity";
import { AntennaController } from "../controllers/AntennaController";
import { EntityManager } from "../managers/EntityManager";

export class CesiumView {
    private tileset: Cesium3DTileset | null = null;
    private viewer: Viewer | null = null;
    private drone: DroneEntity | null = null;
    private antenna: AntennaEntity | null = null;
    private pointingLine: Entity | null = null;
    private payloadTrackAntennaCallback: (() => void) | null = null;
    droneController: DroneController;
    antennaController: AntennaController;
    entityManager: EntityManager;
    trackedAntenna: Entity | null = null;

    constructor(private containerId: string) {
        this.droneController = new DroneController();
        this.antennaController = new AntennaController();
        this.entityManager = new EntityManager();
        this.payloadTrackAntennaCallback = null;
        this.pointingLine = null;
        this.tileset = null;
    }

    async initialize(showFps: boolean = false) {
        if (this.viewer) {
            console.warn("Cesium viewer already initialized.");
            return;
        }
    
        Ion.defaultAccessToken = process.env.CESIUM_ION_TOKEN || '';
        
    
        try {
            console.log("Initializing Cesium viewer...");
            const terrainProvider = await createWorldTerrainAsync();
            this.viewer = new Viewer(this.containerId, {
                terrainProvider: terrainProvider,
                skyAtmosphere: false,
                animation: false,
                timeline: false,
                fullscreenButton: false,
                homeButton: false,
                infoBox: false,
                selectionIndicator: false, 
                navigationHelpButton: false, 
                sceneModePicker: false, 
                geocoder: false, 
                baseLayerPicker: false, 
                vrButton: false, 
                creditContainer: document.createElement('div') // Hide credits
            });
            if (showFps) {
                this.viewer.scene.debugShowFramesPerSecond = true;
            }
            /* this.viewer.scene.fog.density = 0.1;
            this.viewer.scene.fog.enabled = true; */
            const imageryProvider = await createWorldImageryAsync();
            this.viewer.imageryLayers.addImageryProvider(imageryProvider);
            
            console.log("Cesium viewer initialized");
            return this.viewer;
        } catch (error) {
            // Log full error details
            if (error instanceof Error) {
                console.error("Failed to initialize Cesium viewer:", error.message, error.stack);
            } else {
                console.error("Failed to initialize Cesium viewer:", error);
            }
            return null;
        }
    }

    updateCameraOrientationToAntenna2() {
        if (!this.antenna || !this.drone || !this.viewer) {
            return;
        }
    
        const antennaPosition = this.antenna.getEntity().position?.getValue(JulianDate.now());
        const dronePosition = this.droneController.getCurrentPosCartesian();
    
        if (!antennaPosition || !dronePosition) {
            return;
        }
    
        const dronePositionCartographic = Cartographic.fromCartesian(dronePosition);
    
        //adjust the camera to be behind and above the drone
        const offsetDistance = 100.0;
        const heightAboveDrone = 200.0;
    
        //calculate the camera's new position behind and above the drone
        const cameraOffset = new Cartesian3(
            dronePosition.x - offsetDistance,
            dronePosition.y - offsetDistance,
            dronePosition.z + heightAboveDrone
        );
    
        //calculate the direction vector to make the camera look at the antenna
        const directionToAntenna = Cartesian3.normalize(
            Cartesian3.subtract(antennaPosition, cameraOffset, new Cartesian3()),
            new Cartesian3()
        );
    
        //update the camera's position and orientation
        this.viewer.camera.setView({
            destination: cameraOffset,
            orientation: {
                direction: directionToAntenna,
                up: new Cartesian3(0, 0, 1) //keep the camera's up vector aligned with the globe's up direction
            }
        });
    }

    updateCameraOrientationToAntenna() {
        const dronePos = this.droneController.getCurrentPosCartesian();
        const antennaPos = this.antennaController.getCurrentPosCartesian();
        if (!this.viewer || !dronePos || !antennaPos) {
            console.error("Viewer is undefined");
            return
        }

        //calculate the heading and pitch towards the antenna
        const heading = this.calculateHeading(dronePos, antennaPos);
        const pitch = this.calculatePitch(dronePos, antennaPos);

        //update the camera to look towards the antenna
        this.viewer.camera.setView({
            orientation: new HeadingPitchRoll(heading, pitch, 0)
        });
    }

    drawPayloadPointingLine() {
        if (this.pointingLine || !this.viewer || !this.drone || !this.antenna) {
            return
        }
        this.pointingLine = this.viewer.entities.add({
            polyline: {
                positions: new CallbackProperty(() => {
                    const payloadPosition = this.droneController.payloadController.getCurrentPosCartesian();
                    const antennaPosition = this.antennaController.getCurrentPosCartesian();

                    if (payloadPosition && antennaPosition) {
                        return [payloadPosition, antennaPosition]; // Line between payload and antenna
                    } else {
                        return []; // Empty array if positions are undefined
                    }
                }, false), // Recompute the polyline positions on every frame
                width: 2,
                material: Color.RED
            }
        });
    }

    addDroneToDropdown(id: string) {
        const dropdown = document.getElementById("droneSelect") as HTMLSelectElement;
        if (!dropdown) {
            return;
        }
    
        if (Array.from(dropdown.options).some(option => option.value === id)) {
            return;
        }
    
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id;
    
        dropdown.appendChild(option);
    }

    removeDroneFromDropdown(id: string) {
        const dropdown = document.getElementById("droneSelect") as HTMLSelectElement;
        if (!dropdown) {
            return;
        }
    
        const optionToRemove = Array.from(dropdown.options).find(option => option.value === id);
        if (!optionToRemove) {
            return;
        }
    
        dropdown.removeChild(optionToRemove);
    }

    droneSelectionChanged(id: string) {
        if (!this.viewer) {
            return;
        }
        if (id) {
            this.followDrone(id, true);
        } else {
            this.viewer.trackedEntity = undefined;
        }
    }

    addAntenna(id: string, lon: number, lat: number, alt: number, heading: number = 0, pitch: number = 0) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        const antenna = new AntennaEntity(id, Cartesian3.fromDegrees(lon, lat, alt), heading, pitch);
        const antennaEntity = antenna.getEntity()
        const antennaController = new AntennaController()
        antennaController.setAntenna(antennaEntity)
        this.viewer.entities.add(antennaEntity)
        this.entityManager.addEntity(antennaEntity, antennaController)
        this.trackedAntenna = antennaEntity
        console.log(`CesiumView.ts: Antenna added: ${antennaEntity.id}`)
    }

    updateAntennaPos(id: string, lon: number, lat: number, alt: number) {
        if (!this.viewer) {
            console.error("Viewer is null");
        }
        try {
            const antenna = this.entityManager.getControllerByEntityId(id);
            if (antenna instanceof AntennaController) {
                antenna.updatePosition(lon, lat, alt);
            }
        } catch (error) {
            console.error("Failed to update antenna position - ", error)
        }
    }

    updateAntennaRotation(heading: number, pitch: number, roll: number) {
        const headingR = CesiumMath.toRadians(heading); // 0 = facing north
        const pitchR = CesiumMath.toRadians(pitch); // y axis
        const rollR = CesiumMath.toRadians(roll); // x axis

        const hpr = new HeadingPitchRoll(headingR, pitchR, rollR);

        const antenna = this.entityManager.getControllerByEntityId("QSANTENNA");
        if (antenna instanceof AntennaController) {
            const position = antenna.getCurrentPosCartesian();
            if (!position) {
                return;
            }
            const orientation = Transforms.headingPitchRollQuaternion(position, hpr);
            antenna.updateAntennaOrientation(orientation);
        }
    }

    setDemoFlightPath() {
        const lons = [
            10.322797468442731,
            10.322802750363257,
            10.322808112508529,
            10.322813647059872,
            10.322819331257458,
            10.322825176038025,
            10.322831154031046,
            10.322837336625147,
            10.322843603554299,
            10.322850081532488,
            10.322856714626836,
            10.32286351872248,
            10.322870508096859,
            10.322877641919906,
            10.322884989931952,
            10.322892491653624,
            10.322900214605877,
            10.322908093251504,
            10.32291622498101,
            10.322924496323969,
            10.322932967503508,
            10.32294165368665,
            10.322950561026905,
            10.322959678451053,
            10.322969005800454,
            10.322978571747718,
            10.322988354407068,
            10.322998371186634,
            10.323008656429217,
            10.323019072024225,
            10.323029819566564,
            10.323040786750246,
            10.323051984042989,
            10.32306342422966,
            10.323075170294235,
            10.323087138182013,
            10.323099451307181,
            10.323111894745203,
            10.323124767025405,
            10.323137785606594,
            10.323151104047955,
            10.32316473029769,
            10.323178660932767,
            10.323192834317082,
            10.32320734982412,
            10.323222169802012,
            10.323237266805894,
            10.323252678742138,
            10.323268403153333,
            10.323284470542196,
            10.323300805487772,
            10.323317441025429,
            10.32333455540953,
            10.323351775741735,
            10.323369411727723,
            10.323387379373152,
            10.323405788187117,
            10.32342433108966,
            10.323443303450896,
            10.323462659276373,
            10.323482310830808,
            10.323502270573671,
            10.323522639956025,
            10.323543336537844,
            10.323564347836989,
            10.323585867102386,
            10.32360743204075,
            10.323629511898632,
            10.323651923705725,
            10.32367472486803,
            10.323697813561688,
            10.323721264492582,
            10.323745022156396,
            10.323769121947212,
            10.32379360060426,
            10.323818444918004,
            10.323843552629105,
            10.323868993729185,
            10.323894761907827,
            10.32392092275133,
            10.323947346979951,
            10.32397406879125,
            10.324001170464477,
            10.324028523173242,
            10.324056059344976,
            10.324083984922064,
            10.32411229120176,
            10.324140834516145,
            10.32416955503761,
            10.324198681979924,
            10.324227898468836,
            10.324257439694959,
            10.324287271894056,
            10.32431733698454,
            10.324347567686948,
            10.324378079436475,
            10.324408740589211,
            10.324439686586711,
            10.324470743276564,
            10.324502023782383,
            10.324533416813251,
            10.324565072593606,
            10.324596822913454,
            10.324628806994047,
            10.324660688186444,
            10.324692846340298,
            10.324725109271965,
            10.324757451086992,
            10.324789822825414,
            10.324822322460642,
            10.324854960320662,
            10.324887539235423,
            10.324920194355167,
            10.324952923381607,
            10.3249856311995,
            10.325018361527473,
            10.325051085143505,
            10.325083772274978,
            10.32511645117165,
            10.325149144821411,
            10.325181920696517,
            10.32521425559249,
            10.325246952734854,
            10.325279174169127,
            10.325311505770365,
            10.325343803788305,
            10.325375891253296,
            10.325407924312822,
            10.325439832105461,
            10.325471639370429,
            10.325503336852236,
            10.325534789711417,
            10.325566143265272,
            10.32559734983249,
            10.325628355946822,
            10.325659210321778,
            10.32568988809165,
            10.325720326573242,
            10.325750681034883,
            10.32578073719121,
            10.325810633528539,
            10.325840279407146,
            10.325869761701595,
            10.325899007199052,
            10.325928024095983,
            10.325956853374446,
            10.325985376882729,
            10.326013702366133,
            10.326041821059777,
            10.326069672155514,
            10.326097315400922,
            10.326124617371077,
            10.326151739496824,
            10.326178599778254,
            10.326205243480404,
            10.32623156448239,
            10.32625764633883,
            10.326283505408625,
            10.326309060771313,
            10.326334353983608,
            10.32635944566013,
            10.326384312166175,
            10.326408775814203,
            10.326433016309542,
            10.326457022419117,
            10.326480769250452,
            10.326504269786485,
            10.326527533800462,
            10.32655050321831,
            10.326573223578245,
            10.326595673421213,
            10.326617867049622,
            10.326639785803055,
            10.32666146843345,
            10.326682925052317,
            10.326704106119976,
            10.326725054147254,
            10.32674576844123,
            10.326766135684442,
            10.326786366702066,
            10.32680628507076,
            10.326826000742024,
            10.326845466740933,
            10.326864729610735,
            10.326883713770323,
            10.326902446108743,
            10.326920972012038,
            10.326939299658696,
            10.326957367929214,
            10.326975228029664,
            10.326992837178775,
            10.327010228959356,
            10.327027408982138,
            10.327044386097944,
            10.327061137686629,
            10.327077704229621,
            10.327094042343017,
            10.327110158331156,
            10.327126084107343,
            10.32714180673538,
            10.327157329867358,
            10.327172663830709,
            10.327187784065995,
            10.327202733064595,
            10.327217472870313,
            10.327232026052714
        ]
        const lats = [
            55.472008881431876,
            55.4720172100549,
            55.4720255170633,
            55.47203394250119,
            55.47204244634158,
            55.472051040302084,
            55.47205968033732,
            55.472068464423835,
            55.47207721845268,
            55.472086116182226,
            55.47209507523811,
            55.47210411314368,
            55.47211324412782,
            55.472122411174205,
            55.472131699508246,
            55.47214102817809,
            55.47215047665764,
            55.47215996039182,
            55.47216959153185,
            55.472179231243274,
            55.4721889469702,
            55.47219875142142,
            55.47220864647674,
            55.47221861510032,
            55.47222865286526,
            55.47223878582629,
            55.472248986010605,
            55.47225926707896,
            55.472269658719995,
            55.472280018468105,
            55.47229054259432,
            55.47230111497142,
            55.47231174204749,
            55.47232243193288,
            55.47233323796479,
            55.472344077922216,
            55.472355058055165,
            55.47236598321466,
            55.472377110482164,
            55.472388190386056,
            55.47239935113311,
            55.47241059383593,
            55.472421910205256,
            55.47243324609233,
            55.472444676333794,
            55.47245616563696,
            55.47246768841817,
            55.4724792692448,
            55.472490901404406,
            55.47250260224727,
            55.47251431253317,
            55.47252605246074,
            55.47253794094003,
            55.47254971537427,
            55.47256158511174,
            55.472573487648376,
            55.47258548930516,
            55.472597386844335,
            55.472609367023495,
            55.47262139431144,
            55.472633409837954,
            55.4726454180708,
            55.472657475299606,
            55.47266952779033,
            55.47268156478478,
            55.47269369103126,
            55.472705643876004,
            55.472717681232616,
            55.47272969729264,
            55.47274171856902,
            55.47275368775602,
            55.472765640367136,
            55.472777544678145,
            55.47278941528637,
            55.47280126626644,
            55.47281308694871,
            55.47282482587689,
            55.472836513386774,
            55.472848143419306,
            55.4728597417244,
            55.472871247911,
            55.472882674925344,
            55.47289405464165,
            55.47290533019431,
            55.472916473185556,
            55.472927564815,
            55.47293859726694,
            55.47294951188485,
            55.4729602853437,
            55.472971001296585,
            55.472981541737155,
            55.47299199093008,
            55.4730023341692,
            55.473012549490186,
            55.473022613462746,
            55.47303256339861,
            55.4730423553585,
            55.47305203150253,
            55.473061536607695,
            55.47307090507598,
            55.47308010326423,
            55.47308917443944,
            55.47309806975748,
            55.47310682780108,
            55.47311535774925,
            55.47312376211099,
            55.47313199474923,
            55.473140049685966,
            55.47314791595651,
            55.473155618068596,
            55.47316315812002,
            55.47317049180283,
            55.473177651247234,
            55.47318463640189,
            55.473191428189644,
            55.4731980372725,
            55.47320445912206,
            55.4732106896846,
            55.47321673606055,
            55.47322260370837,
            55.4732283051189,
            55.47323375332996,
            55.4732390853553,
            55.47324416640676,
            55.47324909269092,
            55.47325384249807,
            55.473258392475,
            55.47326276751913,
            55.47326695995963,
            55.47327097534149,
            55.473274814599286,
            55.473278464533195,
            55.47328194498224,
            55.473285252818705,
            55.473288385232316,
            55.473291349967624,
            55.47329414721501,
            55.4732967744157,
            55.473299247389576,
            55.47330155146363,
            55.47330370052558,
            55.47330569092507,
            55.4733075313311,
            55.473309219857924,
            55.47331076006706,
            55.47331215682632,
            55.4733134075875,
            55.473314520272034,
            55.473315497006375,
            55.47331633857943,
            55.473317049661276,
            55.47331763013439,
            55.47331808651457,
            55.473318419936724,
            55.473318633685274,
            55.47331872999353,
            55.47331871236141,
            55.47331858328692,
            55.47331834606851,
            55.47331800343467,
            55.473317556994246,
            55.473317009336746,
            55.47331636779144,
            55.47331563101551,
            55.47331480163725,
            55.47331388300651,
            55.473312877162485,
            55.4733117860667,
            55.473310615098626,
            55.47330936464773,
            55.47330803843892,
            55.47330663819543,
            55.47330516767033,
            55.47330362670171,
            55.47330201670225,
            55.473300343740895,
            55.47329860683908,
            55.47329680817362,
            55.47329496035832,
            55.47329304645703,
            55.47329108513997,
            55.47328906793561,
            55.47328700163137,
            55.47328488326203,
            55.47328272327251,
            55.47328052100461,
            55.47327827310392,
            55.47327598025013,
            55.47327365205463,
            55.47327128393364,
            55.47326888352047,
            55.4732664482434,
            55.47326397909957,
            55.47326147651561,
            55.47325894559691,
            55.47325638189641,
            55.47325379380987,
            55.4732511822205,
            55.47324854362649,
            55.47324588173531,
            55.47324319754144,
            55.473240490794446,
            55.473237767440395,
            55.473235021338844,
            55.4732322609499,
            55.473229483616095
        ]
        const alts = [
            67.03922271728516,
            67.6231460571289,
            68.2021255493164,
            68.78589630126953,
            69.37158966064453,
            69.95993041992188,
            70.54784393310547,
            71.14191436767578,
            71.73031616210938,
            72.32467651367188,
            72.91940307617188,
            73.51557922363281,
            74.11407470703125,
            74.71109008789062,
            75.31209564208984,
            75.91177368164062,
            76.5151596069336,
            77.11676788330078,
            77.72362518310547,
            78.32688903808594,
            78.93075561523438,
            79.53592681884766,
            80.14241027832031,
            80.74907684326172,
            81.35557556152344,
            81.96339416503906,
            82.57074737548828,
            83.17837524414062,
            83.78790283203125,
            84.39093017578125,
            84.99880981445312,
            85.60468292236328,
            86.2088623046875,
            86.81172180175781,
            87.4161605834961,
            88.0174560546875,
            88.62138366699219,
            89.21714782714844,
            89.81864929199219,
            90.41228485107422,
            91.0048828125,
            91.59637451171875,
            92.18618774414062,
            92.77141571044922,
            93.35580444335938,
            93.93741607666016,
            94.51485443115234,
            95.08924102783203,
            95.66012573242188,
            96.22821807861328,
            96.7905502319336,
            97.3479995727539,
            97.90602111816406,
            98.45220184326172,
            98.99620819091797,
            99.53499603271484,
            100.07139587402344,
            100.59623718261719,
            101.11770629882812,
            101.63404846191406,
            102.14260864257812,
            102.64350128173828,
            103.13892364501953,
            103.62651062011719,
            104.1057357788086,
            104.58055877685547,
            105.04064178466797,
            105.49586486816406,
            105.94200134277344,
            106.3799057006836,
            106.80735778808594,
            107.22552490234375,
            107.63317108154297,
            108.03070068359375,
            108.4184341430664,
            108.79584503173828,
            109.16120910644531,
            109.51536560058594,
            109.85802459716797,
            110.18978881835938,
            110.5087890625,
            110.81532287597656,
            111.11009979248047,
            111.39153289794922,
            111.65889739990234,
            111.91405487060547,
            112.15660858154297,
            112.38514709472656,
            112.59917449951172,
            112.80022430419922,
            112.98603057861328,
            113.1580581665039,
            113.31590270996094,
            113.45913696289062,
            113.58740234375,
            113.70111846923828,
            113.79973602294922,
            113.88359832763672,
            113.95218658447266,
            114.00575256347656,
            114.0440673828125,
            114.06726837158203,
            114.07518768310547,
            114.06782531738281,
            114.04537200927734,
            114.00760650634766,
            113.95465850830078,
            113.88661193847656,
            113.80364990234375,
            113.70557403564453,
            113.59232330322266,
            113.46466064453125,
            113.32218170166016,
            113.16492462158203,
            112.99341583251953,
            112.80754089355469,
            112.60755920410156,
            112.39376831054688,
            112.16610717773438,
            111.92448425292969,
            111.66841125488281,
            111.40227508544922,
            111.11956787109375,
            110.8276596069336,
            110.52151489257812,
            110.20248413085938,
            109.87250518798828,
            109.5301513671875,
            109.17632293701172,
            108.8108901977539,
            108.43409729003906,
            108.04776763916016,
            107.65032196044922,
            107.24250030517578,
            106.8251953125,
            106.39794921875,
            105.96127319335938,
            105.51628112792969,
            105.06086730957031,
            104.59842681884766,
            104.12706756591797,
            103.64840698242188,
            103.1612319946289,
            102.66694641113281,
            102.16561889648438,
            101.6567153930664,
            101.14256286621094,
            100.62142944335938,
            100.09364318847656,
            99.56055450439453,
            99.02120971679688,
            98.47845458984375,
            97.92929077148438,
            97.37556457519531,
            96.81651306152344,
            96.25460052490234,
            95.68826293945312,
            95.11732482910156,
            94.54377746582031,
            93.96691131591797,
            93.3855209350586,
            92.80030059814453,
            92.2156753540039,
            91.62761688232422,
            91.03656005859375,
            90.44328308105469,
            89.84764862060547,
            89.24959564208984,
            88.65079498291016,
            88.0502700805664,
            87.44877624511719,
            86.84612274169922,
            86.24301147460938,
            85.6385498046875,
            85.03263092041016,
            84.42681121826172,
            83.82006072998047,
            83.21256256103516,
            82.60785675048828,
            81.9998550415039,
            81.39400482177734,
            80.78714752197266,
            80.18087768554688,
            79.57389831542969,
            78.96875762939453,
            78.36479949951172,
            77.76071166992188,
            77.1563491821289,
            76.55389404296875,
            75.95179748535156,
            75.3516616821289,
            74.75250244140625,
            74.1542739868164,
            73.55680084228516,
            72.96102905273438,
            72.36565399169922,
            71.77236938476562,
            71.18110656738281,
            70.59083557128906,
            70.00215911865234,
            69.41509246826172,
            68.82936096191406,
            68.24604034423828,
            67.66362762451172,
            67.08373260498047,
            66.5055923461914
        ]
        this.drawDeterminedFlightPath("tle", lons, lats, alts);
    }

    addDrone(id: string, lon: number, lat: number, alt: number) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        if (!id) {
            id = "drone-entity"
        }
        try {
            const drone = new DroneEntity(this.viewer, id, Cartesian3.fromDegrees(lon, lat, alt));
            const droneController = new DroneController()
            const droneEntity = drone.getEntity()
            const payloadEntity = drone.getPayload()
            droneController.setDrone(droneEntity)
            droneController.setPayload(payloadEntity)
            droneController.setViewer(this.viewer)
            droneController.payloadController.setViewer(this.viewer)
            //this.viewer.trackedEntity = droneEntity;
            this.entityManager.addEntity(droneEntity, droneController)
            this.payloadTrackAntenna(id);
            this.addDroneToDropdown(id);
            console.log(`CesiumView.ts: Drone added: ${droneEntity.id}`)
            return true;
        } catch (error) {
            console.error("Failed to add drone - ", error);
            return false;
        }
    }

    updateDronePos(
        id: string, 
        lon: number, 
        lat: number, 
        alt: number, 
        flightPathEnabled: string = "disabled", 
        spectrumData: number | null = null, 
        showDistance: boolean = false
    ) {
        if (!this.viewer) {
            return console.error("Viewer is null");
        }
        try {
            const drone = this.entityManager.getControllerByEntityId(id);
            if (drone instanceof DroneController) {
                drone.moveDrone(lon, lat, alt, 0.3);
                if (flightPathEnabled == "enabled") {
                    drone.drawLiveFlightPath(lon, lat, alt, spectrumData);
                }
                if (id == "tle") {
                    drone.drawDistanceLine(lon, lat, alt);
                }
            }
        } catch (error) {
            console.error("Failed to update drone position - ", error)
        }
    }

    zoomToCoordinates(lon: number, lat: number, height: number, duration: number) {
        if (!this.viewer) {
            return null;
        }
        this.viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(lon, lat, height),
            orientation: {
                heading: CesiumMath.toRadians(0),    // 0 = north
                pitch: CesiumMath.toRadians(-90),    // Looking down
                roll: 0
            },
            duration: duration
        });
    }

    removeEntity(id: string) {
        if (!this.viewer) {
            return;
        }
        const entity = this.entityManager.getEntityById(id);
        if (entity) {
            this.viewer.entities.remove(entity);
        }
    }

    viewerFog(intensity: number, show: boolean) {
        if (!this.viewer) {
            return;
        }
        if (show) {
            this.viewer.scene.fog.enabled = true;
            this.viewer.scene.fog.density = intensity;
        } else {
            this.viewer.scene.fog.enabled = false;
        }
    }

    setCameraPitch(dy: number) {
        if(!this.viewer) {
            return;
        }
        this.viewer.camera.setView({
            orientation: {
            heading: this.viewer.camera.heading,
            pitch: this.viewer.camera.pitch - CesiumMath.toRadians(dy * 0.1), // Adjust 0.1 for tilt speed
            roll: this.viewer.camera.roll,
            },
        });
    }

    setCameraHeading(dx: number) {
        if(!this.viewer) {
            return;
        }
        this.viewer.camera.setView({
            orientation: {
            heading: this.viewer.camera.heading - CesiumMath.toRadians(dx * 0.1), // Adjust 0.1 for rotation speed
            pitch: this.viewer.camera.pitch,
            roll: this.viewer.camera.roll,
            },
        });
    }

    zoomIn(zoomAmount: number) {
        if (!this.viewer) {
            return;
        }
        this.viewer.camera.zoomIn(zoomAmount);
    }

    zoomOut(zoomAmount: number) {
        if (!this.viewer) {
            return;
        }
        this.viewer.camera.zoomOut(zoomAmount);
    }

    onAddAntennaClicked() {
        const ANTENNA_LONGITUDE = 10.32580470;
        const ANTENNA_LATITUDE = 55.47177510;
        const ANTENNA_ALTITUDE = 0;
        this.addAntenna2(ANTENNA_LONGITUDE, ANTENNA_LATITUDE, ANTENNA_ALTITUDE, false);
    }

    onAddDroneClicked() {
        const INITIAL_LONGITUDE = 10.325663942903187;
        const INITIAL_LATITUDE = 55.472172681892225;
        const INITIAL_ALTITUDE = 60;
        this.addDrone2(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, false);
        this.startDroneSimulation();
    }

    public async addDrone2(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        const testdroneid = "drone-id"
        this.drone = new DroneEntity(this.viewer, testdroneid, Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
        const droneEntity = this.drone.getEntity()
        const payloadEntity = this.drone.getPayload()
        if (tracked) {
            this.viewer.trackedEntity = droneEntity;
        }
        console.log(`CesiumView.ts: Drone added: ${droneEntity.id}`)
        this.droneController?.setDrone(droneEntity)
        this.droneController?.setPayload(payloadEntity)
        this.droneController?.payloadController.setViewer(this.viewer)
        this.droneController?.setViewer(this.viewer)
        this.entityManager.addEntity(this.drone.getEntity(), this.droneController)
        this.payloadTrackAntenna(testdroneid);
        this.addDroneToDropdown(testdroneid);

        const lons: number[] = [];
        const lats: number[] = [];
        const alts: number[] = [];

        const radius = 0.001;
        const altitudeVariation = 5;

        for (let i = 0; i <= 36; i++) {
            const angle = (i * 10) * (Math.PI / 180); // Convert to radians

            const newLon = initialLongitude + radius * Math.cos(angle);
            const newLat = initialLatitude + radius * Math.sin(angle);
            const newAlt = 50 + initialAltitude + altitudeVariation * Math.sin(angle);

            lons.push(newLon);
            lats.push(newLat);
            alts.push(newAlt);
        }
        //this.droneController.setDeterminedFlightPath(lons,lats,alts);
    }

    addAntenna2(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        this.antenna = new AntennaEntity("antenna-entity", Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
        const antennaEntity = this.antenna.getEntity()
        this.trackedAntenna = antennaEntity
        if (this.viewer) {
            this.viewer.entities.add(antennaEntity);
            if (tracked) {
            this.viewer.trackedEntity = antennaEntity;
            }
        }
        console.log(`CesiumView.ts: Antenna added: ${antennaEntity.id}`)
        this.antennaController.setAntenna(this.antenna.getEntity());
    }

    followDrone(drone_id: string, follow: boolean) {
        if (!this.viewer) {
            return;
        }
        if (follow) {
            const drone = this.entityManager.getEntityById(drone_id);
            this.viewer.trackedEntity = drone;
        } else {
            this.viewer.trackedEntity = undefined;
        }
    }

    async toggle3DTiles(enabled: boolean) {
        if (!this.viewer) {
            return;
        }
    
        // If the tileset hasn't been created yet, create and store it
        if (!this.tileset) {
            // "Google photorealistic 3D tileset"
            this.tileset = await Cesium3DTileset.fromIonAssetId(2275207);
        }
    
        if (enabled) {
            // Add the tileset to the scene if it's enabled and not already added
            if (!this.viewer.scene.primitives.contains(this.tileset)) {
                this.viewer.scene.primitives.add(this.tileset);
                console.log("Added 3D tileset");
            }
        } else {
            // Remove the tileset from the scene if it's disabled and currently added
            if (this.viewer.scene.primitives.contains(this.tileset)) {
                this.viewer.scene.primitives.remove(this.tileset);
                this.tileset = null;
                console.log("Removed 3D tileset");
            }
        }
    }

    updatePayloadOrientationToAntenna(droneId: string) {
        const droneController = this.entityManager.getControllerByEntityId(droneId);
        if (!droneController || !(droneController instanceof DroneController) || !this.trackedAntenna) {
            return;
        }
        const dronePosition = droneController.getCurrentPosCartesian();
        //Currently only support for one antenna. 
        //If more antennas were to be added, the drone and antenna should be associated.
        const antennaPosition = this.trackedAntenna.position?.getValue(JulianDate.now());
    
        if (!dronePosition || !antennaPosition) {
            console.error("Drone or Antenna position is undefined!");
            return;
        }
    
        // Compute the direction vector from the drone to the antenna
        const direction = Cartesian3.subtract(antennaPosition, dronePosition, new Cartesian3());
        Cartesian3.normalize(direction, direction); // Normalize the vector
    
        // Create the quaternion to align the payload with the direction vector
        const matrix = Transforms.rotationMatrixFromPositionVelocity(dronePosition, direction);
        const quaternion = Quaternion.fromRotationMatrix(matrix);
    
        // Update the payload's orientation to point towards the antenna
        droneController.payloadController.updatePayloadOrientation(quaternion);
    }

    payloadTrackAntenna(drone_id: string) {
        if (!this.viewer) {
            console.error("Viewer is undefined");
            return;
        }
        this.payloadTrackAntennaCallback = () => {
            this.updatePayloadOrientationToAntenna(drone_id);
            //this.updateOverlay();
        };
        this.viewer.clock.onTick.addEventListener(this.payloadTrackAntennaCallback);
    }

    payloadStopTrackingAntenna() {
        if (this.payloadTrackAntennaCallback && this.viewer) {
            this.viewer.clock.onTick.removeEventListener(this.payloadTrackAntennaCallback);
            this.payloadTrackAntennaCallback = null;
        }
    }

    createFlightPathFromData(
        timestamps: number[],  // Array of UNIX timestamps
        longitudes: number[],  // Array of longitudes in degrees
        latitudes: number[],   // Array of latitudes in degrees
        altitudes: number[],   // Array of altitudes in meters
    ) {
        if (!this.viewer) {
            return;
        }
    
        // Make sure the four arrays are of the same length
        if (timestamps.length !== latitudes.length || timestamps.length !== longitudes.length || timestamps.length !== altitudes.length) {
            console.error("The arrays for time, latitude, longitude, and altitude must have the same length.");
            return;
        }

        const droneEntity = this.viewer.entities.add({
            name: "test",
            point: {
                pixelSize: 10,
                color: Color.RED,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
                heightReference: HeightReference.RELATIVE_TO_GROUND,
            },
            position: new SampledPositionProperty(),  // Position will be updated dynamically
        });
    
        this.viewer.trackedEntity = droneEntity;
        this.viewer.clock.shouldAnimate = true;
    
        // Create a SampledPositionProperty to hold the positions over time
        const positionProperty = new SampledPositionProperty();
    
        // Loop through the arrays and add each sample to the position property
        for (let i = 0; i < timestamps.length; i++) {
            const time = JulianDate.fromDate(new Date(timestamps[i] * 1000));  // Convert UNIX time to JulianDate
            const position = Cartesian3.fromDegrees(longitudes[i], latitudes[i], altitudes[i]);
            positionProperty.addSample(time, position);  // Add the time and position sample
        }
    
        // Assign the position property to the entity
        droneEntity.position = positionProperty;
    
        // Set the clock time range based on the first and last times in the arrays
        const startTime = JulianDate.fromDate(new Date(timestamps[0] * 1000));
        const endTime = JulianDate.fromDate(new Date(timestamps[timestamps.length - 1] * 1000));
        this.viewer.clock.startTime = startTime.clone();
        this.viewer.clock.stopTime = endTime.clone();
        this.viewer.clock.currentTime = startTime.clone();
        this.viewer.clock.clockRange = ClockRange.LOOP_STOP;  // Loop at the end of the flight
        this.viewer.clock.multiplier = 10;
    
        // Fly to the entity's starting position
        const startPosition = droneEntity.position.getValue(startTime);
        if (startPosition) {
            this.viewer.camera.flyTo({
                destination: startPosition,
                orientation: {
                    heading: CesiumMath.toRadians(0),
                    pitch: CesiumMath.toRadians(-45),
                    roll: 0,
                },
                duration: 2
            });
        }
    }

    drawDeterminedFlightPath(drone_id: string, lons: number[], lats: number[], alts: number[]) {
        try {
            const drone = this.entityManager.getControllerByEntityId(drone_id);
            if (drone instanceof DroneController) {
                drone.setDeterminedFlightPath(lons, lats, alts);
            }
        } catch (error) {
            console.error("Failed to draw flight path - ", error)
        }
    }

    removeLiveFlightPath(drone_id: string) {
        const drone = this.entityManager.getControllerByEntityId(drone_id);
        if(drone instanceof DroneController) {
            drone.removeLivePath();
        }
    }

    resetLiveFlightPath(drone_id: string) {
        const drone = this.entityManager.getControllerByEntityId(drone_id);
        if (drone instanceof DroneController) {
            drone.resetLivePath();
        }
    }

    removeDeterminedFlightPath(drone_id: string) {
        const drone = this.entityManager.getControllerByEntityId(drone_id);
        if(drone instanceof DroneController) {
            drone.removeDeterminedFlightPath();
        }
    }

    //helper function to calculate heading from direction vector
    calculateHeading(fromPosition: Cartesian3, toPosition: Cartesian3): number {
        const direction = Cartesian3.subtract(toPosition, fromPosition, new Cartesian3());
        return Math.atan2(direction.y, direction.x);
    }

    //helper function to calculate pitch from direction vector
    calculatePitch(fromPosition: Cartesian3, toPosition: Cartesian3): number {
        const direction = Cartesian3.subtract(toPosition, fromPosition, new Cartesian3());
        const flatDistance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        return Math.atan2(direction.z, flatDistance);
    }

    getViewerInstance() {
        return this.viewer;
    }

    destroy() {
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }
    }

    getRandomPower(): number {
        return Math.floor(Math.random() * 1001);
    }

    startDroneSimulation() {
        //hca
        let longitude = 10.3260;
        let latitude = 55.4725;
        let altitude = 100;

        //chile
        /* let longitude = -70.6014607699504;
        let latitude = -28.491158255396414;
        let altitude = 7000; */


    
        let direction = 1; // Direction of horizontal movement (1 for forward, -1 for backward)
        let movingHorizontally = true; // True when moving horizontally, false when moving down
        let movementDuration = 0; // Time counter for how long it's been moving in the current direction
    
        const intervalId = setInterval(() => {
            const power = this.getRandomPower(); // Generate random power between 0 and 100
    
            if (movingHorizontally) {
                // Move horizontally for 5 seconds
                if (movementDuration < 5000) {
                    longitude += direction * 0.000005;  // +- longitude
                    latitude += direction * 0.000005;   // +- latitude
                } else {
                    // After 5 seconds, switch to vertical movement
                    movingHorizontally = false;
                    movementDuration = 0;  // Reset the duration timer
                }
            } else {
                // Move vertically for 1 second
                if (movementDuration < 1000) {
                    altitude -= 0.2;  // go down 0.2
                } else {
                    // After 1 second, switch back to horizontal movement
                    movingHorizontally = true;
                    movementDuration = 0;  // Reset the duration timer
    
                    // Reverse direction when going back
                    direction *= -1;  // Switch between forward and backward
                }
            }
    
            // Update the drone position and polyline with the new values
            this.droneController.testline(longitude, latitude, altitude, power);
    
            // Update the movement duration timer
            movementDuration += 200; // Increase by the interval time (200ms)
    
        }, 200); // Update every 200 milliseconds
    }
}