///<reference path="scripts/babylon.max.js" />

var gridSize = [10, 10, 10];
var initialMeshes = 250;
var overCrowdingLimit = 6;
var breedingLimit = 5;
var lonelinessLimit = 1;
var gridUpdateInMS = 10000; //two seconds

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

    var gridLength = gridSize[0] * gridSize[1] * gridSize[2];
    for (var i = 0; i < gridLength; ++i) {
        grid[i] = { state: 2 /*dead*/, interval: null, mesh: null, neighbors: 0 };
    }

    for (var i = 0; i < initialMeshes; ++i) {
        var x = ~~(Math.random() * gridSize[0] - 1);
        var y = ~~(Math.random() * gridSize[1] - 1);
        var z = ~~(Math.random() * gridSize[2] - 1);
        if (grid[gridPos(x, y, z)].state == 2) {
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

    camera.target = new BABYLON.Vector3(gridSize[0] / 2, gridSize[1] / 2, gridSize[2] / 2);

    scene.onPointerDown = function (evt, pick) {
        if (pick.hit) {
            var box = pick.pickedMesh;
            death(gridPos(box.position.x, box.position.y, box.position.z), false, grid, scene);
        }
    }
    
}

var gridTick = function (grid, scene) {
    var births = [], deaths = [];
    for (var x = 0; x < gridSize[0]; ++x) {
        for (var y = 0; y < gridSize[1]; ++y) {
            for (var z = 0; z < gridSize[2]; ++z) {
                checkCell(x, y, z, grid, scene);
            }
        }
    }
}

var checkCell = function (x, y, z, grid, scene) {
    var cellPosition = gridPos(x, y, z);
    var neighbors = getNeighbors(x, y, z, grid, scene);
    if (grid[cellPosition].state == 2) {
        if (neighbors.total == breedingLimit) {
            birth(x, y, z, grid, scene);
        }
    } else {
        if (neighbors.total >= overCrowdingLimit) {
            death(cellPosition, false, grid, scene);
        }
        else if (neighbors.total <= lonelinessLimit) {
            death(cellPosition, true, grid, scene);
        }
        else {
            //update(cellPosition, neighbors, grid, scene);
        }
    }
}

var getNeighbors = function (x, y, z, grid, scene, noProp) {
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
                if (box.state != 2) {
                    neighbors.push(grid[gridPos(xTest, yTest, zTest)]);
                    ++totalNeighbors;
                } else {
                    if (grid[gridPos(x, y, z)].state != 2) {
                        checkCell(xTest, yTest, zTest, grid, scene);
                    }
                }
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

    grid[cellPosition].state = 1;
    clearInterval(grid[cellPosition].interval);
    var mesh = grid[cellPosition].mesh;

    //create the scaling animation
    var tmp = [~~(gridUpdateInMS * Math.random()), ~~(gridUpdateInMS * Math.random())];
    var animationDeath = new BABYLON.Animation("deathAnimation", "scaling", Math.max(tmp[0], tmp[1]), BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keys = [];
    keys.push({ frame: Math.min(tmp[0], tmp[1]), value: mesh.scaling });
    keys.push({ frame: Math.max(tmp[0], tmp[1]), value: isAlone ? new BABYLON.Vector3(0, 0, 0) : new BABYLON.Vector3(2 * Math.random(), 2 * Math.random(), 2 * Math.random()) });
    animationDeath.setKeys(keys);

    var easingFunction = new BABYLON.QuinticEase();

    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    animationDeath.setEasingFunction(easingFunction);

    mesh.animations.push(animationDeath);

    //color animation
    var colorAnimation = new BABYLON.Animation("colorAnimation", "material.diffuseColor", gridUpdateInMS, BABYLON.Animation.ANIMATIONTYPE_COLOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keysColor = [];
    keysColor.push({ frame: Math.min(tmp[0], tmp[1]), value: mesh.material.diffuseColor });
    keysColor.push({ frame: Math.max(tmp[0], tmp[1]), value: isAlone ? BABYLON.Color3.Black() : BABYLON.Color3.Red() });
    colorAnimation.setKeys(keysColor);

    mesh.animations.push(colorAnimation);

    scene.beginAnimation(mesh, 0, Math.max(tmp[0], tmp[1]), false, 1.5, function () {
        grid[cellPosition].state = 2;
        mesh.dispose();
        grid[cellPosition].mesh = null;
    });
}

//when a new cell is born...
var birth = function (x, y, z, grid, scene) {
    //a clone hack...
    var box = scene.meshes.length ? scene.meshes[0].clone() : new BABYLON.Mesh.CreateBox("box", 1, scene);

    box.material = new BABYLON.StandardMaterial("boxMat", scene);

    box.position = new BABYLON.Vector3(x, y, z);
    box.scaling = BABYLON.Vector3.Zero();

    //create the scaling animation
    var tmp = [~~(gridUpdateInMS * Math.random()), ~~(gridUpdateInMS * Math.random())];

    var animationBirth = new BABYLON.Animation("birthAnimation", "scaling", Math.max(tmp[0], tmp[1]), BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keys = [];
    keys.push({ frame: 0, value: box.scaling });
    keys.push({ frame: Math.max(tmp[0], tmp[1]), value: new BABYLON.Vector3(1, 1, 1) });
    animationBirth.setKeys(keys);

    var easingFunction = new BABYLON.CircleEase();

    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    animationBirth.setEasingFunction(easingFunction);

    box.animations.push(animationBirth);

    //color animation
    var colorAnimation = new BABYLON.Animation("colorAnimation", "material.diffuseColor", gridUpdateInMS, BABYLON.Animation.ANIMATIONTYPE_COLOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var keysColor = [];
    keysColor.push({ frame: Math.min(tmp[0], tmp[1]), value: box.material.diffuseColor });
    keysColor.push({ frame: Math.max(tmp[0], tmp[1]), value: BABYLON.Color3.White() });
    colorAnimation.setKeys(keysColor);

    box.animations.push(colorAnimation);

    scene.beginAnimation(box, 0, Math.max(tmp[0], tmp[1]), false, 2*Math.random() + 0.5, function () {
        checkCell(x, y, z, grid, scene);
        box.interval = setInterval(function () {
            checkCell(x, y, z, grid, scene);
        }, Math.max(tmp[0], tmp[1]));
    });

    grid[gridPos(x, y, z)].mesh = box;
    grid[gridPos(x, y, z)].state = 0;
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