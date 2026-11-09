import type {Site,Recipe} from './engine';
export const RECIPE_CATEGORIES:Record<string,{name:string;match:RegExp;ids:string[];prefix?:string}>={
 food:{name:'Lebensmittel',match:/food|lebensmittel|zucker|sugar|chocol|kakao|coffee|kaffee|pasta/,ids:['sugar','pasta','chocolate','coffee','feed','retail-cannedFood','retail-frozenFood','retail-petFood','retail-softDrinks','retail-iceCream','retail-frozenPizza','retail-sausages']},
 bakery:{name:'Backwaren',match:/bäck|backwaren|bakery|baking/,ids:['bread','biscuits','pastry']},
 metal:{name:'Metall & Werkstoffe',match:/metal|steel|stahl|alumin|copper|kupfer|hütte|foundry/,ids:['steel','aluminium','copper','coils','beams','retail-tools','retail-steelPipes','retail-cables']},
 wood:{name:'Holz & Möbel',match:/wood|holz|möbel|furniture|sawmill/,ids:['lumber','furniture','packaging','retail-woodPallets','retail-parquet']},
 paper:{name:'Papier & Verpackung',match:/paper|papier|karton|cardboard|packag|druck|print/,ids:['paper','cardboard','packaging','retail-books','retail-stationery','retail-toiletPaper']},
 building:{name:'Baustoffe & Glas',match:/cement|zement|concrete|beton|glass|glas|baustoff/,ids:['cement','concrete','glass','bottles','retail-insulation','retail-roofTiles']},
 electronics:{name:'Elektronik',match:/electro|elektro|computer|solar|semiconductor/,ids:['electronics','computers','batteries','solar','retail-electricalAppliances','retail-householdAppliances','retail-smartphones','retail-televisions','retail-gameConsoles','retail-ledLamps','retail-eBikes']},
 automotive:{name:'Fahrzeugteile',match:/automotive|fahrzeug|auto|reifen|tire/,ids:['tires','batteries'],prefix:'auto-'},
 machinery:{name:'Maschinen & Schwerindustrie',match:/machine|maschinen|crane|schwer|wind|turbine/,ids:[],prefix:'heavy-'},
 textile:{name:'Textilien',match:/textil|cloth|bekleid|cotton|weberei/,ids:['textiles','clothing','bandages','retail-footwear','retail-sportswear','retail-bedding','retail-bags']},
 consumer:{name:'Haushaltswaren',match:/soap|seife|cosmetic|kosmetik|clean|reinig/,ids:['retail-soap','retail-cleaners','retail-cosmetics','retail-paint','retail-toys','retail-sportsEquipment','retail-detergent','retail-diapers','retail-bicycles']}
};
export function factoryCategory(site:Pick<Site,'id'|'name'|'tags'|'sourceName'>){const text=[site.tags?.industrial,site.tags?.product,site.tags?.craft,site.sourceName||site.name].join(' ').toLowerCase();const exact=Object.entries(RECIPE_CATEGORIES).find(([,c])=>c.match.test(text));if(exact)return exact[0];let h=0;for(const c of site.id)h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return Object.keys(RECIPE_CATEGORIES)[h%Object.keys(RECIPE_CATEGORIES).length];}
export function factoryRecipes(site:Site,catalog:Recipe[]){const category=RECIPE_CATEGORIES[factoryCategory(site)];return catalog.filter(r=>category.ids.includes(r.id)||!!category.prefix&&r.id.startsWith(category.prefix)).map(r=>r.id);}
