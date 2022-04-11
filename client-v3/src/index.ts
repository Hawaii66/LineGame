import { io } from "socket.io-client";
import { City } from "./Interfaces/City";
import { Color } from "./Interfaces/Color";
import { Coord, Player } from "./Interfaces/Player";
import { Team } from "./Interfaces/Team";
import MountJoystick, { GetOffsetNormalized } from "./Joystick";

var resolution = 0;
var playerSpeed = 0.1;
var canvas:HTMLCanvasElement;
var healthbar:HTMLDivElement;
var lastTick = Date.now();
var delta = 0;
var cityRadius = 20;
var playerRadius = 15;
var healthRadius = 10;
var colors:Color[] = [
    {
        color:"#2980b9",
        fadeColor:"#4396cc"
    },{
        color:"#f39c12",
        fadeColor:"#f0a630"
    },{
        color:"#16a085",
        fadeColor:"#16ba99"
    },{
        color:"#e74c3c",
        fadeColor:"#e05d4f"
    }
];
var playerIndex = 0;
var players:Player[]=[{health:100,coord:{x:1000,y:1000},drawing:false,id:"123",name:"HawaiiDev",path:[],startCity:null,team:0},
{health:100,coord:{x:0,y:0},drawing:false,id:"123",name:"HawaiiDev",path:[],startCity:null,team:0}];
var teams:Team[]=[{cities:[],color:"#000000",connections:[],index:0}];
var offset:Coord = {x:0,y:0}
var startoffset:Coord = {x:0,y:0}

function DrawTeam(context:CanvasRenderingContext2D, team:Team)
{
    team.connections.forEach(connection => {
        context.beginPath();
        context.strokeStyle = team.color;
        context.lineWidth = 4 * resolution;
        DrawPath(context, connection.path);
        context.stroke();

        connection.points.forEach(point => {
            context.fillStyle = team.color;
            context.beginPath();
            context.arc(point.coord.x * resolution, point.coord.y * resolution, cityRadius / 2 * resolution, 0, 2 * Math.PI);
            context.fill();
        });
    });
    team.cities.forEach(city=>DrawCity(context, city));
}

function DrawPath(context:CanvasRenderingContext2D, path:Coord[])
{
    if(path.length < 1){return;}

    context.moveTo(path[0].x * resolution, path[0].y * resolution);
    path.forEach(pos=>{
        context.lineTo(pos.x * resolution, pos.y * resolution);
        context.moveTo(pos.x * resolution, pos.y * resolution);
    });
}

function DrawCity(context:CanvasRenderingContext2D, city:City)
{
    context.fillStyle = city.color;
    context.beginPath();
    context.arc(city.coord.x * resolution, city.coord.y * resolution, cityRadius * resolution, 0, 2 * Math.PI);
    context.fill();
    return context;
}

function DrawPlayer(context:CanvasRenderingContext2D, player:Player)
{
    if(player.drawing && player.path.length > 2){
        if(player.path[player.path.length - 1].x === player.coord.x && player.path[player.path.length - 1].y === player.coord.y)
        {

        }else{
            player.path.push({x:player.coord.x,y:player.coord.y});
        }

        context.strokeStyle = GetColorsFromPlayer(player).fadeColor;
        context.beginPath();
        context.lineWidth = 6 * resolution;
        context.moveTo(player.path[0].x * resolution, player.path[0].y * resolution);
        player.path.forEach(pos => {
            context.lineTo(pos.x * resolution, pos.y * resolution);
            context.moveTo(pos.x * resolution, pos.y * resolution);
        });
        context.stroke();
    }

    context.fillStyle = GetColorsFromPlayer(player).color;
    context.beginPath();
    context.arc(player.coord.x * resolution, player.coord.y * resolution, playerRadius * resolution, 0, 2 * Math.PI);
    context.fill();

    context.font = "20px Georgia";
    context.textAlign = "center";
    context.fillText(`${player.name}: ${player.drawing}`, player.coord.x * resolution, (player.coord.y + playerRadius + 15) * resolution);

    return context;
}

function DrawGrid(context: CanvasRenderingContext2D) {
    for (var x = 0; x < 2001; x += 50) {
        context.moveTo(x * resolution, 0);
        context.lineTo(x * resolution, 2000 * resolution);
    }

    for (var y = 0; y < 2001; y += 50) {
        context.moveTo(0, y * resolution);
        context.lineTo(2000 * resolution, y * resolution);
    }

    context.strokeStyle = "#cfd1d1"
    context.stroke();

    return context;
}

function GetColorsFromPlayer(player:Player):Color
{
    for(var i = 0; i < teams.length; i ++)
    {
        if(teams[i].index === player.team)
        {
            return colors[i];
        }
    }

    return {color:"ffffff",fadeColor:"000000"};
}

function SetResolution(res: number)
{
    if(res === resolution){return;}

    resolution = res;
    resolution = Math.max(0, Math.min(2, resolution));
    canvas.width = 2000 * resolution;
    canvas.height = 2000 * resolution;
    canvas.style.width = `${2000 * resolution}px`;
    canvas.style.height = `${2000 * resolution}px`;
}

function MoveTo(coord:Coord, res:number, context:CanvasRenderingContext2D)
{
    SetResolution(res);
    offset = {x:(-coord.x * resolution + window.innerWidth / 2),y:(-coord.y * resolution + window.innerHeight / 2)};

    context.translate(offset.x, offset.y);
    startoffset = offset;
}

function Update()
{
    var time = Date.now();
    delta = time - lastTick;
    lastTick = time;

    var context = canvas.getContext("2d");

    canvas.width = 2000 * resolution;
    canvas.height = 2000 * resolution;
    canvas.style.width = `${2000 * resolution}px`;
    canvas.style.height = `${2000 * resolution}px`;

    if (context === null) { return; }

    if(players.length > playerIndex)
    {
        const joystick = GetOffsetNormalized();

        const prev = {x:players[playerIndex].coord.x,y:players[playerIndex].coord.y};

        players[playerIndex].coord.x += joystick.x * playerSpeed * delta;
        players[playerIndex].coord.y += joystick.y * playerSpeed * delta;

        if(prev.x !== players[playerIndex].coord.x || prev.y !== players[playerIndex].coord.y)
        {
            socket.emit("move",players[playerIndex].coord);
        }
        
        MoveTo(players[playerIndex].coord, 2, context);
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    
    context = DrawGrid(context);

    //Draw players
    players.forEach(player=>{
        DrawPlayer(context, player);
    });

    //Draw teams
    teams.forEach(team=>{
        DrawTeam(context, team);
    });


    requestAnimationFrame(Update);
}

canvas = document.getElementById("canvas") as HTMLCanvasElement;
healthbar = document.getElementsByClassName("healthbar")[0].getElementsByClassName("healthbar-health")[0] as HTMLDivElement;

//SetupListeners();
SetResolution(2);
MoveTo({x:1000,y:1000}, 2, canvas.getContext("2d"));
MountJoystick();

Update();

const socket = io("http://localhost:5000/",{
    reconnectionDelayMax:10000,
});

socket.emit("join","HawaiiDev");

socket.on("join",data=>{
    playerIndex = data.index;
    players = data.players;
    teams = data.teams;

    document.getElementsByClassName("debug")[0].getElementsByClassName("index")[0].textContent = `${playerIndex}`;
});

socket.on("player-disconnect",data=>{
    players = data;
});

socket.on("move",data=>{
    players = data;
});

socket.on("health",data=>{
    players[playerIndex].health = data.health;

    healthbar.style.width = `${players[playerIndex].health}%`;
});

socket.on("kill",data=>{
    players = data;

    healthbar.style.width = `${players[playerIndex].health}%`;
});

socket.on("update",data=>{
    players[playerIndex].drawing = data.drawing;
    players[playerIndex].path = data.path;
    players[playerIndex].startCity = data.startCity;
});

socket.on("path",data=>{
    for(var i = 0; i < players.length; i++)
    {
        if(players[i].id === data.index)
        {
            players[i].path = data.path;
        }
    }
})

socket.on("city-connect",data=>{
    teams = data;
});

socket.on("destroy-point",data=>{
    console.log("Destory point");
    teams = data;
});

socket.on("concuer-city",data=>{
    teams = data;
});