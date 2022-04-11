import { City } from "./City"

export interface Player
{
    coord:Coord,
    path:Coord[],
    drawing:boolean,
    team:number,
    startCity:City,
    health:number,
    name:string,
    id:string
}

export interface Coord
{
    x:number,
    y:number
}