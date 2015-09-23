///<reference path="scripts/babylon.max.js" />

var gridSize = [20, 20, 20];
var overCrowdingLimit = 6;
var breedingLimit = 5;
var lonelinessLimit = 1;

var createScene = function () {
    // Get the canvas element from our HTML below
    var canvas = document.getElementById("renderCanvas");

    // Load the BABYLON 3D engine
    var engine = new BABYLON.Engine(canvas, true);

    var scene = new BABYLON.Scene(engine);

    engine.runRenderLoop(function () {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });

    var camera = new BABYLON.ArcRotateCamera("Camera", 3 * Math.PI / 2, Math.PI / 8, 50, BABYLON.Vector3.Zero(), scene);

    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);

    var grid = [];

    for (var i = 0; i < 300; ++i) {
        var x = ~~(Math.random() * gridSize[0] - 1);
        var y = ~~(Math.random() * gridSize[1] - 1);
        var z = ~~(Math.random() * gridSize[2] - 1);
        if (!grid[gridPos(x, y, z)]) {
            birth(x, y, z, grid, scene);
        }
    }

    setInterval(function () {
        gridTick(grid, scene);
    }, 1000);

    camera.target = new BABYLON.Vector3(gridSize[0] / 2, gridSize[1] / 2, gridSize[2] / 2);

}

var gridTick = function (grid, scene) {
    var births = [], deaths = [];
    for (var x = 0; x < gridSize[0]; ++x) {
        for (var y = 0; y < gridSize[1]; ++y) {
            for (var z = 0; z < gridSize[2]; ++z) {
                var cellPosition = gridPos(x,y,z);
                var neighbors = getNumberOfNeighbors(x, y, z, grid);
                if (!grid[cellPosition]) {
                    if (neighbors == breedingLimit) {
                        //birth(x, y, z, grid, scene);
                        births.push([x,y,z]);
                    }
                } else {
                    if (neighbors >= overCrowdingLimit) {
                        //death(cellPosition, false, grid);
                        deaths.push({ cellPosition: cellPosition, isAlone: false });
                    }
                    else if (neighbors <= lonelinessLimit) {
                        //death(cellPosition, true, grid);
                        deaths.push({ cellPosition: cellPosition, isAlone: true });
                    }
                    else {
                        //update(cellPosition, neighbors, grid);
                    }
                }
            }
        }
    }

    births.forEach(function (birthDef) {
        birth(birthDef[0], birthDef[1], birthDef[2], grid, scene);
    });

    deaths.forEach(function (deathDef) {
        death(deathDef.cellPosition, deathDef.isAlone, grid);
    });
}

var getNumberOfNeighbors = function (x, y, z, grid) {
    var totalNeighbors = 0;

    var xLow = x > 0 ? x - 1 : 0;
    var yLow = y > 0 ? y - 1 : 0;
    var zLow = z > 0 ? z - 1 : 0;

    // + 2 for the for loops.
    var xHigh = x + 1 < gridSize[0] ? x + 2 : gridSize[0];
    var yHigh = y + 1 < gridSize[1] ? y + 2 : gridSize[1];
    var zHigh = z + 1 < gridSize[2] ? z + 2 : gridSize[2];

    for (var xTest = xLow; xTest < xHigh; ++xTest) {
        for (var yTest = yLow; yTest < yHigh; ++yTest) {
            for (var zTest = zLow; zTest < zHigh; ++zTest) {
                if (xTest == x && yTest == y && zTest == z) continue;
                if (grid[gridPos(xTest, yTest, zTest)]) {
                    ++totalNeighbors;
                }
            }
        }
    }

    return totalNeighbors;    
}

var gridPos = function(x,y,z) {
    return z * gridSize[1] * gridSize[0] + y * gridSize[0] + x;
}

//when a cell dies...
var death = function (cellPosition, isAlone, grid) {
    grid[cellPosition].dispose();
    grid[cellPosition] = null;
}

//when a new cell is born...
var birth = function (x, y, z, grid, scene) {
    //a clone hack...
    var box = scene.meshes.length ? scene.meshes[0].clone() : new BABYLON.Mesh.CreateBox("box", 1, scene);
    box.position = new BABYLON.Vector3(x, y, z);
    grid[gridPos(x,y,z)] = box;
}

//update living cell
var update = function (cellPosition, totalNeighbors, grid) {

}