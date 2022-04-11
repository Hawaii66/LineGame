import { Coord } from "./Interfaces/Player";

var thumbStart: Coord = {x:0,y:0};
var moving = false;
var currentOffset:Coord = {x:0,y:0}

export default function MountJoystick()
{
    const joystick = document.getElementsByClassName("joystick")[0] as HTMLDivElement;
    const thumb = joystick.getElementsByClassName("joystick-thumb")[0] as HTMLDivElement;

    thumb.onmousedown = MouseDown;
    thumb.onmousemove = MouseMove;
    thumb.onmouseup = MouseStop;

    document.onmousemove = MouseMove;
    document.onmouseup = MouseStop;
}

export function GetOffset()
{
    return currentOffset;
}

export function GetOffsetNormalized()
{
    var coord = currentOffset;

    var magnitue = Math.sqrt(currentOffset.x * currentOffset.x + currentOffset.y * currentOffset.y);
    if(magnitue !== 0)
    {
        coord.x /= magnitue;
        coord.y /= magnitue;
    }

    return coord;
}

function MouseDown(e:MouseEvent)
{
    moving = true;
    thumbStart = {
        x:e.x,
        y:e.y
    };
    currentOffset = {x:0,y:0};
}

function MouseMove(e:MouseEvent)
{
    if(!moving){return;}

    const joystick = document.getElementsByClassName("joystick")[0] as HTMLDivElement;
    const thumb = joystick.getElementsByClassName("joystick-thumb")[0] as HTMLDivElement;

    var coord = {
        x:e.x - thumbStart.x,
        y:e.y - thumbStart.y
    };

    var magnitue = Math.sqrt(coord.x * coord.x + coord.y * coord.y);
    if(magnitue > 50)
    {
        coord.x /= magnitue;
        coord.y /= magnitue;

        var maxDist = 50;
        coord.x *= maxDist;
        coord.y *= maxDist;
    }

    currentOffset = coord;

    thumb.style.marginLeft = `${25 + coord.x}px`;
    thumb.style.marginTop = `${25 + coord.y}px`;
}

function MouseStop()
{
    if(!moving){return;}

    const joystick = document.getElementsByClassName("joystick")[0] as HTMLDivElement;
    const thumb = joystick.getElementsByClassName("joystick-thumb")[0] as HTMLDivElement;
    moving = false;
    const coord = {
        x:0,
        y:0
    };

    currentOffset = coord;

    thumb.style.marginLeft = `${25 + coord.x}px`;
    thumb.style.marginTop = `${25 + coord.y}px`;
}