import { City } from "./City"

export interface Coord
{
    x:number,
    y:number
};

export interface Player
{
    coord:Coord,
    id:string,
    name:string,
    drawing:boolean,
    path:Coord[],
    team:number,
    startCity:City,
    health:number
}