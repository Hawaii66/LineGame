import cors from 'cors';
import express from 'express';
const app = express();
import http from 'http';
import { createConnection } from 'net';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Color } from './Interfaces/Color';
import { Coord, Player } from './Interfaces/Player';
import { Connection, ConnectionPoint, Team } from './Interfaces/Team';
import { City } from './Interfaces/City';
import { kill } from 'process';
const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:"*"
    }
});

var players:Player[] = [];
var teams:Team[] = [];
var colors:Color[] = [];
var sockets:Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>[] = [];
var cityRadius = 20;
var playerRadius = 15;
var healthRadius = 10;

app.use(cors());

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

io.on("connection",socket=>{
    socket.on("join",name=>{
        sockets.push(socket);

        var teamIndex = randomIntFromInterval(0, 3);
        var team = GetTeam(teamIndex);

        const player:Player = {
            coord:team.cities[0].coord,
            drawing:false,
            id:socket.id,
            name:name,
            path:[],
            startCity:team.cities[0],
            team:teamIndex,
            health:100
        }

        players.push(player);

        const data = {
            players:players,
            index:players.length - 1,
            teams:teams
        }
        
        socket.emit("join",data);
    });

    socket.on("disconnect",()=>{
        const index = GetPlayerIndex(socket.id);
        if(index === -1){return;}

        players.splice(index,1);

        socket.broadcast.emit("player-disconnect",players);
    });

    socket.on("move",coord=>{
        var player = GetPlayer(socket.id);
        if(player === null){return;}

        player.coord = coord;
        socket.broadcast.emit("move",players);
        
        for(var i = 0; i < teams.length; i ++)
        {
            var team = teams[i];
            if(player.team !== team.index)
            {
                for(var j = 0; j < team.connections.length; j ++)
                {
                    var connection = team.connections[j];
                    for(var k = 0; k < connection.points.length; k ++)
                    {
                        if(CollidingCoords(player.coord, connection.points[k].coord, true, playerRadius, cityRadius / 2))
                        {
                            DestroyPoint(connection.points[k], team);
                            return;
                        }
                    }
                }
            }
        }
    });
});

function GetPlayer(id:string)
{
    const index = GetPlayerIndex(id);
    if(index === -1){return null;}
    return players[index];
}

function GetPlayerIndex(id:string)
{
    for(var i = 0; i < players.length; i ++)
    {
        if(players[i].id === id)
        {
            return i;
        }
    }

    console.log("No player found: " + id);
    return -1;
}

function GetSocket(id:string)
{
    for(var i = 0; i < sockets.length; i ++)
    {
        if(sockets[i].id === id)
        {
            return sockets[i];
        }
    }

    console.log("No socket found: " + id);
    process.exit();
}

function GetTeam(index:number)
{
    for(var i = 0; i < teams.length; i ++)
    {
        if(teams[i].index === index)
        {
            return teams[i];
        }
    }

    console.log("Error no team found: " + index);
    process.exit();
}

function GetCity(index:number)
{
    for(var i = 0; i < teams.length; i ++)
    {
        for(var j = 0; j < teams[i].cities.length; j ++)
        {
            if(teams[i].cities[j].id === index)
            {
                return teams[i].cities[j];
            }
        }
    }

    console.log("Error no city found: " + index);
    process.exit();
}

function PopulateTeams()
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
        const color:Color = {
            color:teamColors[i],
            fadeColor:teamFade[i]
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
            team:index,
            id:randomIntFromInterval(1000, 9999)
        };
        cities.push(city);
    }

    return cities;
}

function Kill(id:string)
{
    var player = GetPlayer(id);
    if(player === null){return;}

    if(player.startCity === null)
    {
        player.coord = GetTeam(player.team).cities[0].coord;
    }else{
        player.coord = player.startCity.coord;
    }

    player.path = [];
    player.drawing = false;
    player.health = 100;
}

function Colliding(city: City, player: Player, playerInside:boolean)
{
    var distX = (city.coord.x - player.coord.x);
    var distY = (city.coord.y - player.coord.y);
    distX *= distX;
    distY *= distY;

    var radius = (cityRadius + playerRadius) * (cityRadius + playerRadius);
    if(playerInside){radius = cityRadius * cityRadius}

    if(distX + distY <= radius)
    {
        return true;
    }

    return false;
}

function CollidingCoords(start:Coord, end:Coord, playerInside:boolean, rad1:number, rad2:number)
{
    var distX = (start.x - end.x);
    var distY = (start.y - end.y);
    distX *= distX;
    distY *= distY;

    var radius = (rad1 + rad2) * (rad1 + rad2);
    if(playerInside){radius = rad1 * rad1}

    if(distX + distY <= radius)
    {
        return true;
    }

    return false;
}

function ConnectCities(city1:City, city2: City, path:Coord[])
{
    var team = GetTeam(city1.team);

    for(var i = 0; i < team.connections.length; i ++)
    {
        if(team.connections[i].start === city1 && team.connections[i].end === city2){
            return;
        }
        if(team.connections[i].end === city1 && team.connections[i].start === city2){
            return;
        }
    }


    var points:ConnectionPoint[] = [];
    var id = randomIntFromInterval(1000, 9999)
    var connection:Connection = {
        start:city2,
        end:city1,
        path:path,
        points:points,
        id:id
    }

    const middle = Math.round(path.length / 2);

    points.push({
        connectionID:id,
        coord:path[middle]
    });

    for(var i = 100; i < path.length; i += 100)
    {
        if(middle + i >= path.length - 25){break;}
        if(middle - i < 25){break;}

        points.push({
            connectionID:id,
            coord:path[i + middle]
        });
        points.push({
            connectionID:id,
            coord:path[middle - i]
        });
    }

    team.connections.push(connection);

    io.emit("city-connect",teams);
}

function SameCoord(c1:Coord, c2:Coord)
{
    return c1.x === c2.x && c2.y === c1.y;
}

function DestoryConnection(con:Connection, team:Team)
{
    for(var i = 0; i < team.connections.length; i ++)
    {
        if(team.connections[i].id === con.id)
        {
            team.connections.splice(i, 1);
        }
    }
}

function DestroyPoint(point:ConnectionPoint, team:Team)
{
    var hasRemoved = false;
    team.connections.forEach(con => {
        for(var i = 0; i < con.points.length; i ++)
        {
            if(!hasRemoved && SameCoord(point.coord, con.points[i].coord))
            {
                con.points.splice(i, 1);
                hasRemoved = true;

                console.log(con.points.length);
                if(con.points.length === 0)
                {
                    DestoryConnection(con, team);
                }

                io.emit("destroy-point", teams);
            }
        }
    });
}

function GetCityConnections(city:City, team:Team)
{
    var count = 0;
    for(var i = 0; i < team.connections.length; i ++)
    {
        if(team.connections[i].start.id === city.id || team.connections[i].end.id === city.id)
        {
            count += 1;
        }
    }
    
    return count;
}

function ConcuerCity(city:City, oldTeam:Team, newTeam:Team)
{
    var index = 0;
    for(var i = 0; i < oldTeam.cities.length; i ++)
    {
        if(oldTeam.cities[i].id === city.id)
        {
            index = i;
            break;
        }
    }

    var moveCity = oldTeam.cities.splice(index, 1)[0];
    newTeam.cities.push({
        color:newTeam.color,
        coord:{
            x:moveCity.coord.x,
            y:moveCity.coord.y
        },
        id:moveCity.id,
        team:newTeam.index
    });

    io.emit("concuer-city",teams);
}

var lastTick = Date.now();
var delta = 0;
function Update()
{
    const time = Date.now();
    delta = time - lastTick;
    lastTick = time;
    
    players.forEach(player=>{
        player.health -= delta / 1000 * 4;

        if(player.health > 0){
            GetSocket(player.id).emit("health",player);
        }else{
            Kill(player.id);
            io.emit("kill",players);
        }

        for(var i = 0; i < teams.length; i ++)
        {
            var team = teams[i];
            for(var j = 0; j < team.cities.length; j ++)
            {
                var city = team.cities[j];

                if(player.team === team.index)
                {
                    if(Colliding(city, player, true))
                    {
                        if(player.drawing)
                        {
                            if(city.id !== player.startCity.id)
                            {
                                ConnectCities(city, player.startCity, [...player.path]);
                            }

                            player.drawing = true;
                            player.startCity = city;
                            player.path = [];
                        }else{
                            player.drawing = true;
                            player.startCity = city;
                            player.path = [];
                        }

                        GetSocket(player.id).emit("update",player);
                    }
                }else{
                    if(Colliding(city, player, true) && GetCityConnections(city, team) === 0)
                    {
                        ConcuerCity(city, team, GetTeam(player.team));
                    }
                }
            }
        }

        if(player.drawing)
        {
            if(player.path.length < 2 || player.path[player.path.length - 1].x !== player.coord.x || player.path[player.path.length - 1].y !== player.coord.y)
            {
                player.path.push({x:player.coord.x,y:player.coord.y});
                io.emit("path",{path:player.path,index:player.id});
            }
        }
    });
}

server.listen(5000, () => {
    PopulateTeams();
    setInterval(Update,5);
    console.log('listening on http://localhost:5000');
});

function randomIntFromInterval(min:number, max:number)
{ // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function RandomCoord()
{
    return {
        x:Math.random() * 2000,
        y:Math.random() * 2000
    }
}
