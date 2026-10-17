import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiJson } from "../lib/apiClient";

export type ArchiveRecord={state:string;error?:string;bytes_removed?:number;manifest?:{verified:boolean};artifacts:{role:string;scene_order?:number;local_object_key:string;size:number;verified:boolean;local_removed:boolean;intermediate?:boolean;drive_file_id?:string}[]};

export function useProjectStorage(id:string,enabled=true):UseQueryResult<ArchiveRecord,Error>{
 return useQuery({queryKey:["projectStorage",id],queryFn:()=>apiJson<ArchiveRecord>(`/storage/projects/${encodeURIComponent(id)}`),enabled,refetchInterval:3000});
}