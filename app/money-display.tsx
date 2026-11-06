'use client';
import {createContext,useContext,useMemo} from 'react';
import {formatMoney,type MoneyDisplay} from '../lib/money';
export const MoneyDisplayContext=createContext<MoneyDisplay>('full');
export function useMoney(){const display=useContext(MoneyDisplayContext);return useMemo(()=>(amount:number)=>formatMoney(amount,display),[display]);}
