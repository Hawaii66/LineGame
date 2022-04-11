import cors from 'cors';
import express from 'express';
const app = express();
import http from 'http';
import { createConnection } from 'net';
const server = http.createServer(app);
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { City } from './Interfaces/City';
import { TeamColor } from './Interfaces/Color';
import { Coord, Player } from './Interfaces/Player';
import { Connection, ConnectionPoint, Team } from './Interfaces/Team';
const io = new Server(server,{
    cors:{
        origin:"*"
    }
});

var players:Player[] = [];
var teams:Team[] = [];
var colors:TeamColor[] = [];
var sockets:Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>[] = [];

app.use(cors());

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

io.on("connection", (socket)=>{
    sockets.push(socket);

    socket.on("join",(name)=>{
        const team = randomIntFromInterval(0, 3);
        const player:Player = {
            coord:teams[team].cities[0].coord,
            drawing:false,
            health:100,
            name:name,
            path:[],
            startCity:teams[team].cities[0],
            team:team,
            id:socket.id
        }
        players.push(player);

        const data = {
            players:players,
            teams:teams,
            colors:colors,
            index:players.length - 1
        }

        socket.emit("welcome",data);

        io.emit("update",GetData())
    });

    socket.on("disconnect",()=>{
        var count = 0;
        players.forEach(player=>{
            if(player.id === socket.id)
            {
                players.splice(count, 1);
            }

            count += 1;
        });
    });

    socket.on("move",(data)=>{
        var player = GetPlayer(socket.id);
        player.coord = data;

        socket.broadcast.emit("update",GetData());
    });

    socket.on("connection-create",data=>{
        var team = GetTeam(data.endCity);
        var player = data.player;
        var city = GetCity(data.endCity);
        if(city === null){console.log("No city found");return;}

        var canCreateConnection = true;
        team.connections.forEach(con=>{
            if(con.start == player.startCity && con.end === city){
                canCreateConnection = false;
            }
            if(con.end == player.startCity && con.start === city){
                canCreateConnection = false;
            }
        });

        if(canCreateConnection)
        {
            const connection = CreateConnection(city, player.startCity, [...player.path]);
            team.connections.push(connection);
        }

        player.drawing = false;
        player.startCity = null;
        player.path = [];

        socket.emit("connection-created",player);
    });

    socket.on("draw-start",data=>{
        var {player, city} = data;

        var acctualCity = GetCity(city);

        GetPlayer(player.id).drawing = true;
        GetPlayer(player.id).startCity = acctualCity;

        socket.emit("update-player", GetPlayer(player.id));
    });
});

var lastTick = Date.now();
var delta = 0;
function Update()
{
    const time = Date.now();
    delta = time - lastTick;
    lastTick = time;

    if(players.length === 0){return;}

    players.forEach(player => {
        TickHealth(player);
    });

    io.emit("update", GetData());
}

function CreateConnection(start:City, end:City, path:Coord[])
{
    var points:ConnectionPoint[] = [];
    var connection:Connection = {
        end:end,
        start:start,
        path:path,
        points:points
    };

    const middle = Math.round(path.length / 2);

    points.push({
        connection:connection,
        coord:path[middle]
    });

    for(var i = 100; i < path.length; i += 100)
    {
        if(middle + i >= path.length - 25){break;}
        if(middle - i < 25){break;}

        points.push({
            connection:connection,
            coord:path[i + middle]
        });
        points.push({
            connection:connection,
            coord:path[middle - i]
        });
    }

    connection.points = points;

    return connection;    
}

function TickHealth(player:Player)
{
    player.health -= delta / 1000 * 4;

    if(player.health <= 0)
    {
        if(player.startCity !== null)
        {
            player.coord = {x:player.startCity.coord.x,y:player.startCity.coord.y};
        }else{
            teams.forEach(team=>{
                if(team.index === player.team)
                {
                    player.coord = {x:team.cities[0].coord.x,y:team.cities[0].coord.y};
                }
            });
        }
        player.health = 100;
        player.drawing = false;
        player.path = [];

        const socket = GetSocket(player.id);
        socket.emit("die", player);
    }
}

function GetPlayer(id:string)
{
    var currentPlayer:Player = players[0];
    players.forEach(player=>{
        if(player.id.toString() === id.toString())
        {
            currentPlayer = player;
        }
    });

    return currentPlayer;
}

function GetSocket(id:string)
{
    for(var i = 0; i < sockets.length; i ++)
    {
        if(sockets[i].id === id){return sockets[i];}
    }

    console.log("WARNING no socket found: " + id);
    return sockets[0];
}

function GetTeam(city:City)
{
    for(var i = 0; i < teams.length; i ++)
    {
        for(var j = 0; j < teams[i].cities.length; j ++)
        {
            if(teams[i].cities[j].coord.x === city.coord.x && teams[i].cities[j].coord.y === city.coord.y)
            {
                return teams[i];
            }
        }
    }

    console.log("WARNING no team found: ", city);

    return teams[0];
}

function GetCity(city:City)
{
    var acctualCity:City = {
        color:"000000",
        coord:{x:0,y:0},
        team:0
    };
    teams.forEach(team=>{
        team.cities.forEach(c=>{
            if(c.coord.x  === city.coord.x && c.coord.y === city.coord.y)
            {
                acctualCity = c;
            }
        });
    });

    return acctualCity
}


function GetData()
{
    return {
        players:players,
        teams:teams,
        colors:colors
    };
}

function GenerateTeams()
{
    const teamColors = ["#2980b9", "#f39c12", "#16a085", "#e74c3c"];
    const teamFade = ["#4396cc","#f0a630","#16ba99","#e05d4f"]
    for(var i = 0; i < 4; i ++)
    {
        const team:Team = {
            cities:GenerateCities(i, teamColors[i]),
            color:teamColors[i],
            connections:[],
            index:i
        }
        const color:TeamColor = {
            color:teamColors[i],
            faded:teamFade[i]
        }

        colors[i] = color;
        teams[i] = team;
    }
}

function GenerateCities(index:number, color:string)
{
    var cities:City[] = [];
    for(var i = 0; i < 5; i ++)
    {
        const city:City = {
            color:color,
            coord:RandomCoord(),
            team:index
        };
        cities.push(city);
    }

    return cities;
}

function RandomCoord()
{
    return {
        x:Math.random() * 2000,
        y:Math.random() * 2000
    }
}

server.listen(5000, () => {
    GenerateTeams();
    setInterval(Update,1);
  console.log('listening on http://localhost:5000');
});

function randomIntFromInterval(min:number, max:number) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
  }