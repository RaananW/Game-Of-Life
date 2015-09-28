///<reference path="scripts/babylon.max.js" />

var gridSize = [15, 15, 15];
var initialMeshes = 200;
var overCrowdingLimit = 6;
var breedingLimit = 5;
var lonelinessLimit = 1;
var gridUpdateInMS = 1000; //two seconds

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

    initScene(scene, camera);
}

var initGrid = function (gridSize, initialMeshes, scene) {
    var grid = [];

    for (var i = 0; i < initialMeshes; ++i) {
        var x = ~~(Math.random() * gridSize[0] - 1);
        var y = ~~(Math.random() * gridSize[1] - 1);
        var z = ~~(Math.random() * gridSize[2] - 1);
        if (!grid[gridPos(x, y, z)]) {
            birth(x, y, z, grid, scene);
        }
    }

    return grid;
}

var initScene = function (scene, camera) {
    scene.meshes.forEach(function (mesh) {
        mesh.dispose();
    });

    var grid = initGrid(gridSize, initialMeshes, scene);

    ////setInterval(function () {
    //    gridTick(grid, scene);
    //}, gridUpdateInMS);

    camera.target = new BABYLON.Vector3(gridSize[0] / 2, gridSize[1] / 2, gridSize[2] / 2);
}

var gridTick = function (grid, scene) {
    var births = [], deaths = [];
    for (var x = 0; x < gridSize[0]; ++x) {
        for (var y = 0; y < gridSize[1]; ++y) {
            for (var z = 0; z < gridSize[2]; ++z) {
                checkCell(x, y, z, grid, scene, deaths, births);
            }
        }
    }

    births.forEach(function (birthDef) {
        birth(birthDef.pos[0], birthDef.pos[1], birthDef.pos[2], grid, scene);
    });

    deaths.forEach(function (deathDef) {
        death(deathDef.cellPosition, deathDef.isAlone, grid, scene);
    });
}

var checkCell = function (x, y, z, grid, scene, /*tmp!*/deaths, births) {
    var cellPosition = gridPos(x, y, z);
    var neighbors = getNeighbors(x, y, z, grid);
    if (!grid[cellPosition]) {
        if (neighbors.total == breedingLimit) {
            //births.push({ pos: [x, y, z], neighbors: neighbors });
            console.log("birth");
            birth(x, y, z, grid, scene);
        }
    } else {
        if (neighbors.total >= overCrowdingLimit) {
            //deaths.push({ cellPosition: cellPosition, isAlone: false, neighbors: neighbors });
            death(cellPosition, false, grid, scene);
        }
        else if (neighbors.total <= lonelinessLimit) {
            //deaths.push({ cellPosition: cellPosition, isAlone: true, neighbors: neighbors });
            death(cellPosition, true, grid, scene);
        }
        else {
            //update(cellPosition, neighbors, grid, scene);
        }
    }
}

var getNeighbors = function (x, y, z, grid) {
    var totalNeighbors = 0;
    var neighbors = [];

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
                var box = grid[gridPos(xTest, yTest, zTest)]
                if (box && !box.dead) {
                    neighbors.push(grid[gridPos(xTest, yTest, zTest)]);
                    ++totalNeighbors;
                }
                //check here for births of the neighboring cells
            }
        }
    }

    return { total: totalNeighbors, neighbors: neighbors };
}

var gridPos = function(x,y,z) {
    return z * gridSize[1] * gridSize[0] + y * gridSize[0] + x;
}

//when a cell dies...
var death = function (cellPosition, isAlone, grid, scene) {

    grid[cellPosition].dead = true;
    clearInterval(grid[cellPosition].interval)

    //create the scaling animation
    var animationDeath = new BABYLON.Animation("deathAnimation", "scaling", gridUpdateInMS, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keys = [];
    keys.push({ frame: ~~(gridUpdateInMS * Math.random()), value: grid[cellPosition].scaling });
    keys.push({ frame: gridUpdateInMS, value: isAlone ? new BABYLON.Vector3(0, 0, 0) : new BABYLON.Vector3(2 * Math.random(), 2 * Math.random(), 2 * Math.random()) });
    animationDeath.setKeys(keys);

    var easingFunction = new BABYLON.QuinticEase();

    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    animationDeath.setEasingFunction(easingFunction);

    grid[cellPosition].animations.push(animationDeath);

    //color animation
    var colorAnimation = new BABYLON.Animation("colorAnimation", "material.diffuseColor", gridUpdateInMS, BABYLON.Animation.ANIMATIONTYPE_COLOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keysColor = [];
    keysColor.push({ frame: ~~(gridUpdateInMS * Math.random()), value: grid[cellPosition].material.diffuseColor });
    keysColor.push({ frame: gridUpdateInMS, value: isAlone ? BABYLON.Color3.Black() : BABYLON.Color3.Red() });
    colorAnimation.setKeys(keysColor);

    grid[cellPosition].animations.push(colorAnimation);

    scene.beginAnimation(grid[cellPosition], 0, gridUpdateInMS, false, 1.5, function () {
        //safety
        if (grid[cellPosition]) {
            grid[cellPosition].dispose();
            grid[cellPosition] = null;
        }
    });
}

//when a new cell is born...
var birth = function (x, y, z, grid, scene) {
    //a clone hack...
    var box = scene.meshes.length ? scene.meshes[0].clone() : new BABYLON.Mesh.CreateBox("box", 1, scene);

    //if (!box.material) {
        box.material = new BABYLON.StandardMaterial("boxMat", scene);
    //}

    box.position = new BABYLON.Vector3(x, y, z);
    box.scaling = BABYLON.Vector3.Zero();

    //create the scaling animation
    var animationBirth = new BABYLON.Animation("birthAnimation", "scaling", gridUpdateInMS, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keys = [];
    var tmp = [~~(gridUpdateInMS * Math.random()), ~~(gridUpdateInMS * Math.random())];
    keys.push({ frame: Math.min(tmp[0], tmp[1]), value: box.scaling });
    keys.push({ frame: Math.max(tmp[0], tmp[1]), value: new BABYLON.Vector3(1, 1, 1) });
    animationBirth.setKeys(keys);

    var easingFunction = new BABYLON.CircleEase();

    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    animationBirth.setEasingFunction(easingFunction);

    box.animations.push(animationBirth);

    scene.beginAnimation(box, 0, gridUpdateInMS, false);

    grid[gridPos(x, y, z)] = box;
    
    box.interval = setInterval(function () {
        console.log("tick");
        checkCell(x, y, z, grid, scene);
    }, gridUpdateInMS);
}

//update living cell
var update = function (cellPosition, neighbors, grid, scene) {
    //change the cell color
    var color = overCrowdingLimit / (neighbors.total + 1);

    //color animation
    /*var colorAnimation = new BABYLON.Animation("colorAnimation", "material.diffuseColor", gridUpdateInMS, BABYLON.Animation.ANIMATIONTYPE_COLOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keysColor = [];
    keysColor.push({ frame: ~~(gridUpdateInMS * Math.random()), value: grid[cellPosition].material.diffuseColor });
    keysColor.push({ frame: gridUpdateInMS, value: new BABYLON.Color3(color, color, color) });
    colorAnimation.setKeys(keysColor);

    grid[cellPosition].animations.push(colorAnimation);

    scene.beginAnimation(grid[cellPosition], 0, gridUpdateInMS, false, 2);*/
}