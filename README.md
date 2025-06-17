# Afgangsprojekt 2024 – 3D-modul til droneovervågning

Dette projekt er resultatet af vores afsluttende afgangsprojekt på Diplomingeniør uddannelsen i Softwareteknologi, hvor vi udviklede et 3D-modul, der integreres i en PySide-klient og visualiserer dronepositioner i realtid. Modulet er målrettet droneoperatører, som har brug for et intuitivt visuelt overblik over flyvninger og dronernes aktuelle placering i terrænet.

## 🎯 Formål

Formålet var at skabe et modul, der via en moderne 3D-visualisering gør det muligt for operatører at overvåge droner i luftrummet og interagere med dronens rute og data. Løsningen er fleksibel og kan indgå som komponent i større kontrolsystemer.

## 🧱 Teknologier brugt

- **CesiumJS** – 3D-globus og scenevisualisering
- **TypeScript** – Logik og applikationsstruktur
- **PySide** – Desktop-klient i Python (ekstern integration)
- **Webpack** – Bygning af TypeScript-projektet
- JSON-baseret kommunikation mellem modul og PySide-app

## 🛠 Funktionalitet

- Visualisering af dronens position på 3D-globus
- Indlæsning af rutedata fra eksternt input
- Dynamisk opdatering af rute og position
- Designet til integration i Python-klient via embedded webview

## Authors
Modulet er lavet af Victor Woydowski Dralle og Christian Kisholt

## ✅ Status

Modulet er færdigudviklet og fungerer som et selvstændigt webmodul, der kan indlæses i en PySide-applikation. Det blev testet med realistiske dronerutedata og leveret som en plug-and-play-komponent.

## Eksempel
![dronetrackerimg](https://github.com/user-attachments/assets/ca905a88-eda8-40e9-8497-33054b557b0f)
