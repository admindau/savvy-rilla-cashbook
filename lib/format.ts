export const fmt=(n:number,c:string)=> new Intl.NumberFormat(undefined,{style:'currency',currency:c}).format(n);
export const currencies=['SSP','USD','KES'] as const;
