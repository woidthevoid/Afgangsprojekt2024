
import * as d3 from 'd3';
export class PlotController {

    makePlot() {
        var data: number[][] = [
            [30, 86, 168, 281, 303, 365],
            [45, 96, 128, 245, 303, 195],
            [75, 65, 285, 175, 130, 210],
            [100, 80, 200, 125, 290, 175],
            [200, 120, 130, 280, 85, 205]
        ];
    
        var svg = d3.select("svg");
        var width = +svg.attr("width");
        var height = +svg.attr("height");
    
        // Number of rows and columns in the data array
        var numRows = data.length;
        var numCols = data[0].length;
    
        // Calculate the width and height of each cell in the grid
        var cellWidth = width / numCols;
        var cellHeight = height / numRows;
    
        // Flatten the 2D array and calculate min and max values safely
        const flatData = data.flat();
        const minVal = d3.min(flatData) ?? 0; // Default to 0 if min is undefined
        const maxVal = d3.max(flatData) ?? 1; // Default to 1 if max is undefined
    
        // Create a color scale using the safe min and max values
        var colorScale = d3.scaleSequential(d3.interpolateViridis).domain([minVal, maxVal]);
    
        // Create the raster plot by adding rects for each cell in the data
        svg.selectAll("rect")
           .data(flatData)  // Flatten the 2D array into a 1D array
           .enter()
           .append("rect")
           .attr("width", cellWidth)
           .attr("height", cellHeight)
           .attr("x", (d, i) => (i % numCols) * cellWidth)  // Compute the x-position
           .attr("y", (d, i) => Math.floor(i / numCols) * cellHeight)  // Compute the y-position
           .attr("fill", d => colorScale(d));  // Color the cell based on data value
    }
    
    
}