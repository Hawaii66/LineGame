import { City } from "./City"
import { Coord } from "./Player"

export interface Team
{
    cities:City[],
    index:number,
    color:string,
    connections:Connection[]
}

export interface Connection
{
    id:number,
    start:City,
    end:City,
    path:Coord[],
    points:ConnectionPoint[]
}

export interface ConnectionPoint
{
    coord:Coord,
    connectionID:number
}