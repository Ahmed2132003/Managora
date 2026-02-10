import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type CatalogItemType = "product" | "service";
export type CatalogItem = { id:number; item_type:CatalogItemType; name:string; barcode:string; stock_quantity:string; cost_price:string; sale_price:string; is_active:boolean; created_at:string };
export type CatalogItemPayload = { item_type:CatalogItemType; name:string; barcode:string; stock_quantity?:string; cost_price:string; sale_price:string };

export function useCatalogItems(){return useQuery({queryKey:["catalog-items"],queryFn:async()=> (await http.get<CatalogItem[]>(endpoints.catalogItems)).data});}
export function useCreateCatalogItem(){const qc=useQueryClient();return useMutation({mutationFn:async(payload:CatalogItemPayload)=>(await http.post<CatalogItem>(endpoints.catalogItems,payload)).data,onSuccess:()=>qc.invalidateQueries({queryKey:["catalog-items"]})});}
export function useUpdateCatalogItem(){const qc=useQueryClient();return useMutation({mutationFn:async({id,payload}:{id:number;payload:Partial<CatalogItemPayload>})=>(await http.patch<CatalogItem>(endpoints.catalogItem(id),payload)).data,onSuccess:()=>qc.invalidateQueries({queryKey:["catalog-items"]})});}
export function useDeleteCatalogItem(){const qc=useQueryClient();return useMutation({mutationFn:async(id:number)=>{await http.delete(endpoints.catalogItem(id));},onSuccess:()=>qc.invalidateQueries({queryKey:["catalog-items"]})});}
export function useAddStock(){const qc=useQueryClient();return useMutation({mutationFn:async({id,quantity,memo}:{id:number;quantity:string;memo?:string})=>(await http.post(endpoints.catalogItemAddStock(id),{quantity,memo})).data,onSuccess:()=>{qc.invalidateQueries({queryKey:["catalog-items"]});qc.invalidateQueries({queryKey:["inventory-transactions"]});}});}
export function useRemoveStock(){const qc=useQueryClient();return useMutation({mutationFn:async({id,quantity,memo,reason}:{id:number;quantity:string;memo?:string;reason?:string})=>(await http.post(endpoints.catalogItemRemoveStock(id),{quantity,memo,reason})).data,onSuccess:()=>{qc.invalidateQueries({queryKey:["catalog-items"]});qc.invalidateQueries({queryKey:["inventory-transactions"]});}});}

export type StockTransaction={id:number;item_name:string;transaction_type:string;quantity_delta:string;unit_cost:string;unit_price:string;memo:string;created_at:string};
export function useInventoryTransactions(){return useQuery({queryKey:["inventory-transactions"],queryFn:async()=> (await http.get<StockTransaction[]>(endpoints.inventoryTransactions)).data});}