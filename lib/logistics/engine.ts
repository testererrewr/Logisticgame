import {ensureServicePlan,serviceQuantity,consumeService,type ServicePlan} from './line-coordination';
import {isManualLine} from './manual-line';
import {stageManualFreight} from './manual-loading';
import {finishTerminalTransfers,terminalReserved,type TerminalTransfer} from './terminal-transfer';
import {effectiveVehicleSpeed,vehicleTravelDays} from './vehicle-speed';
import {receivingCapacity,firstPotentialLoadStop} from './cargo-routing';
import {containerTerms} from './container-terms';
import {loadingContainerOrders,containerStopAllows,validateContainerSelection,activeContainerOrder} from './container-routing';
import {ensureFinance,recordFinance,type FinanceBook} from './finance';
import {ensureVehicleStatistics,recordVehicleDistance,recordTransportedEh} from './vehicle-statistics';
import {remainingDemand} from './business-rules.ts';
import {factoryRecipes} from './recipe-categories.ts';
import {RETAIL,woodKind,stableHash,retailKind,excludedBusiness,fixedDemand,consumeDemand,newMarket,resetMarket,type DailyMarket} from './business-rules';
import extraGoods from '../../data/logistics-extra-goods.json';
import extraRecipes from '../../data/logistics-extra-recipes.json';
import {placement,gridOverlaps,type BuildGrid} from './build-grid.ts';
import {REAL_VEHICLES,REAL_WAGONS,TRAILERS} from './vehicle-catalog.ts';
export {TRAILERS} from './vehicle-catalog.ts';
import {railRoute,snapTrackEndpoint} from './routing.ts';
/* Weltverbund Logistik – standalone deterministic freight economy.
   Real-world partner identity/coordinates are sourced from OSM; *all* capacities,
   recipes, demand, pricing and offers are explicitly fictional game parameters. */
export type GoodId=string;
export type FreightType='bulk'|'chilled'|'general'|'container'|'heavy'|'liquid'|'hazardous'|'pharma'|'livestock';
export const FREIGHT_NAMES:Record<FreightType,string>={bulk:'Schüttgut',chilled:'Kühlgut',general:'Stückgut',container:'Container',heavy:'Schwerlast',liquid:'Flüssigkeit / Tank',hazardous:'Gefahrgut',pharma:'Pharma / temperaturgeführt',livestock:'Lebendvieh'};
export type Mode='van'|'truck'|'rail'|'ship'|'air';
export type PartnerKind='oilWell'|'farm'|'mine'|'mill'|'bakery'|'factory'|'supermarket'|'restaurant'|'dealer'|'warehouse'|'hospital'|'pharmacy'|'chemical'|'refinery'|'forestry'|'recycling'|'dairy'|'beverage'|'slaughterhouse'|'automotive'|'textile'|'construction'|'wholesale'|'butcherShop'|'fishShop'|'produceShop'|'clothesShop'|'electronicsShop'|'hardwareShop'|'carPartsShop'|'furnitureShop'|'bookShop'|'florist'|'petShop'|'fuelStation'|'beautyShop'|'toyShop'|'sportsShop'|'garage'|'carDealer'|'sawmill';
export type BuildingKind='depot'|'railDepot'|'railStation'|'shipDepot'|'inlandPort'|'port'|'airport'|'airDepot'|'hub'|'warehouse'|'warehouseSmall'|'warehouseMedium'|'warehouseXL';
export type SiteType=PartnerKind|BuildingKind;
export interface Good {id:GoodId;name:string;type:FreightType;purchase:number;sale:number;icon:string;requiresHeavy?:boolean}
export const GOODS:Good[]=[
 {id:'wheat',name:'Weizen',type:'bulk',purchase:140,sale:230,icon:'🌾'},
 {id:'corn',name:'Mais',type:'bulk',purchase:120,sale:195,icon:'🌽'},
 {id:'milk',name:'Milch',type:'chilled',purchase:330,sale:510,icon:'🥛'},
 {id:'apples',name:'Äpfel',type:'chilled',purchase:290,sale:450,icon:'🍎'},
 {id:'timber',name:'Rundholz',type:'heavy',purchase:95,sale:160,icon:'🪵'},
 {id:'ironOre',name:'Eisenerz',type:'bulk',purchase:100,sale:180,icon:'⛏️'},
 {id:'rareEarth',name:'Seltene Erden',type:'container',purchase:3000,sale:4300,icon:'💎'},
 {id:'flour',name:'Mehl',type:'bulk',purchase:230,sale:430,icon:'🌾'},
 {id:'bread',name:'Brot',type:'general',purchase:560,sale:920,icon:'🍞'},
 {id:'pastry',name:'Gebäck',type:'chilled',purchase:700,sale:1140,icon:'🥐'},
 {id:'biscuits',name:'Kekse',type:'general',purchase:650,sale:990,icon:'🍪'},
 {id:'lumber',name:'Schnittholz',type:'heavy',purchase:170,sale:330,icon:'🪵'},
 {id:'steel',name:'Stahl',type:'heavy',purchase:440,sale:700,icon:'🏗️'},
 {id:'electronics',name:'Elektronik',type:'container',purchase:4000,sale:6300,icon:'💻'},
 {id:'packaging',name:'Verpackungen',type:'general',purchase:310,sale:550,icon:'📦'},
 {id:'containers',name:'Containerfracht',type:'container',purchase:0,sale:0,icon:'🚢'},
 {"id": "barley", "name": "Gerste", "type": "bulk", "purchase": 130, "sale": 202, "icon": "🌾"},
 {"id": "oats", "name": "Hafer", "type": "bulk", "purchase": 150, "sale": 232, "icon": "🌾"},
 {"id": "rye", "name": "Roggen", "type": "bulk", "purchase": 135, "sale": 209, "icon": "🌾"},
 {"id": "rice", "name": "Reis", "type": "bulk", "purchase": 450, "sale": 698, "icon": "🌾"},
 {"id": "soy", "name": "Sojabohnen", "type": "bulk", "purchase": 380, "sale": 589, "icon": "🌾"},
 {"id": "sugarBeet", "name": "Zuckerrüben", "type": "bulk", "purchase": 70, "sale": 108, "icon": "🌾"},
 {"id": "potatoes", "name": "Kartoffeln", "type": "bulk", "purchase": 210, "sale": 326, "icon": "🌾"},
 {"id": "sand", "name": "Sand", "type": "bulk", "purchase": 25, "sale": 39, "icon": "🌾"},
 {"id": "gravel", "name": "Kies", "type": "bulk", "purchase": 30, "sale": 46, "icon": "🌾"},
 {"id": "limestone", "name": "Kalkstein", "type": "bulk", "purchase": 22, "sale": 34, "icon": "🌾"},
 {"id": "coal", "name": "Kohle", "type": "bulk", "purchase": 100, "sale": 155, "icon": "🌾"},
 {"id": "bauxite", "name": "Bauxit", "type": "bulk", "purchase": 160, "sale": 248, "icon": "🌾"},
 {"id": "copperOre", "name": "Kupfererz", "type": "bulk", "purchase": 260, "sale": 403, "icon": "🌾"},
 {"id": "lithium", "name": "Lithiumkonzentrat", "type": "bulk", "purchase": 2300, "sale": 3565, "icon": "🌾"},
 {"id": "salt", "name": "Salz", "type": "bulk", "purchase": 90, "sale": 140, "icon": "🌾"},
 {"id": "cement", "name": "Zement", "type": "bulk", "purchase": 110, "sale": 170, "icon": "🌾"},
 {"id": "fertilizer", "name": "Dünger", "type": "bulk", "purchase": 350, "sale": 542, "icon": "🌾"},
 {"id": "sugar", "name": "Zucker", "type": "bulk", "purchase": 400, "sale": 620, "icon": "🌾"},
 {"id": "malt", "name": "Malz", "type": "bulk", "purchase": 340, "sale": 527, "icon": "🌾"},
 {"id": "animalFeed", "name": "Tierfutter", "type": "bulk", "purchase": 220, "sale": 341, "icon": "🌾"},
 {"id": "coffeeBeans", "name": "Kaffeebohnen", "type": "bulk", "purchase": 2300, "sale": 3565, "icon": "🌾"},
 {"id": "cocoa", "name": "Kakao", "type": "bulk", "purchase": 2500, "sale": 3875, "icon": "🌾"},
 {"id": "vegetables", "name": "Gemüse", "type": "chilled", "purchase": 480, "sale": 744, "icon": "❄️"},
 {"id": "tomatoes", "name": "Tomaten", "type": "chilled", "purchase": 620, "sale": 961, "icon": "❄️"},
 {"id": "grapes", "name": "Trauben", "type": "chilled", "purchase": 850, "sale": 1318, "icon": "❄️"},
 {"id": "eggs", "name": "Eier", "type": "chilled", "purchase": 1100, "sale": 1705, "icon": "❄️"},
 {"id": "beef", "name": "Rindfleisch", "type": "chilled", "purchase": 4200, "sale": 6510, "icon": "❄️"},
 {"id": "pork", "name": "Schweinefleisch", "type": "chilled", "purchase": 2500, "sale": 3875, "icon": "❄️"},
 {"id": "poultry", "name": "Geflügelfleisch", "type": "chilled", "purchase": 2200, "sale": 3410, "icon": "❄️"},
 {"id": "fish", "name": "Fisch", "type": "chilled", "purchase": 3100, "sale": 4805, "icon": "❄️"},
 {"id": "cheese", "name": "Käse", "type": "chilled", "purchase": 3900, "sale": 6045, "icon": "❄️"},
 {"id": "butter", "name": "Butter", "type": "chilled", "purchase": 4200, "sale": 6510, "icon": "❄️"},
 {"id": "yogurt", "name": "Joghurt", "type": "chilled", "purchase": 1200, "sale": 1860, "icon": "❄️"},
 {"id": "frozenFood", "name": "Tiefkühlkost", "type": "chilled", "purchase": 2200, "sale": 3410, "icon": "❄️"},
 {"id": "freshJuice", "name": "Frischsaft", "type": "chilled", "purchase": 1300, "sale": 2015, "icon": "❄️"},
 {"id": "pasta", "name": "Teigwaren", "type": "general", "purchase": 1000, "sale": 1550, "icon": "📦"},
 {"id": "cannedFood", "name": "Konserven", "type": "general", "purchase": 1700, "sale": 2635, "icon": "📦"},
 {"id": "chocolate", "name": "Schokolade", "type": "general", "purchase": 4500, "sale": 6975, "icon": "📦"},
 {"id": "roastedCoffee", "name": "Röstkaffee", "type": "general", "purchase": 5600, "sale": 8680, "icon": "📦"},
 {"id": "paper", "name": "Papier", "type": "general", "purchase": 540, "sale": 837, "icon": "📦"},
 {"id": "cardboard", "name": "Karton", "type": "general", "purchase": 350, "sale": 542, "icon": "📦"},
 {"id": "textiles", "name": "Textilien", "type": "general", "purchase": 2800, "sale": 4340, "icon": "📦"},
 {"id": "clothing", "name": "Bekleidung", "type": "general", "purchase": 7000, "sale": 10850, "icon": "📦"},
 {"id": "furniture", "name": "Möbel", "type": "general", "purchase": 2400, "sale": 3720, "icon": "📦"},
 {"id": "glass", "name": "Glas", "type": "general", "purchase": 450, "sale": 698, "icon": "📦"},
 {"id": "bottles", "name": "Glasflaschen", "type": "general", "purchase": 520, "sale": 806, "icon": "📦"},
 {"id": "tires", "name": "Reifen", "type": "general", "purchase": 3500, "sale": 5425, "icon": "📦"},
 {"id": "spareParts", "name": "Ersatzteile", "type": "general", "purchase": 4500, "sale": 6975, "icon": "📦"},
 {"id": "medicalSupplies", "name": "Medizinischer Bedarf", "type": "general", "purchase": 6500, "sale": 10075, "icon": "📦"},
 {"id": "bandages", "name": "Verbandmaterial", "type": "general", "purchase": 4500, "sale": 6975, "icon": "📦"},
 {"id": "syringes", "name": "Spritzen / Einwegmaterial", "type": "general", "purchase": 5500, "sale": 8525, "icon": "📦"},
 {"id": "soap", "name": "Seife", "type": "general", "purchase": 1800, "sale": 2790, "icon": "📦"},
 {"id": "cleaners", "name": "Reinigungsmittel", "type": "general", "purchase": 1400, "sale": 2170, "icon": "📦"},
 {"id": "woodPellets", "name": "Holzpellets (Säcke)", "type": "general", "purchase": 270, "sale": 418, "icon": "📦"},
 {"id": "plasticGranules", "name": "Kunststoffgranulat (Säcke)", "type": "general", "purchase": 1100, "sale": 1705, "icon": "📦"},
 {"id": "batteries", "name": "Batteriesysteme (gesichert)", "type": "container", "purchase": 11000, "sale": 17050, "icon": "🚢"},
 {"id": "solarPanels", "name": "Solarmodule", "type": "container", "purchase": 9000, "sale": 13950, "icon": "🚢"},
 {"id": "computers", "name": "Computer", "type": "container", "purchase": 15000, "sale": 23250, "icon": "🚢"},
 {"id": "machineryParts", "name": "Maschinenkomponenten", "type": "container", "purchase": 7500, "sale": 11625, "icon": "🚢"},
 {"id": "rubber", "name": "Kautschuk", "type": "container", "purchase": 1900, "sale": 2945, "icon": "🚢"},
 {"id": "cotton", "name": "Baumwolle", "type": "container", "purchase": 1700, "sale": 2635, "icon": "🚢"},
 {"id": "aluminium", "name": "Aluminium", "type": "heavy", "purchase": 2300, "sale": 3565, "icon": "🏗️"},
 {"id": "copper", "name": "Kupfer", "type": "heavy", "purchase": 7600, "sale": 11780, "icon": "🏗️"},
 {"id": "steelCoils", "name": "Stahlcoils", "type": "heavy", "purchase": 800, "sale": 1240, "icon": "🏗️"},
 {"id": "steelBeams", "name": "Stahlträger", "type": "heavy", "purchase": 900, "sale": 1395, "icon": "🏗️"},
 {"id": "concreteElements", "name": "Betonfertigteile", "type": "heavy", "purchase": 180, "sale": 279, "icon": "🏗️"},
 {"id": "bricks", "name": "Ziegel", "type": "heavy", "purchase": 110, "sale": 170, "icon": "🏗️"},
 {"id": "machines", "name": "Maschinen", "type": "heavy", "purchase": 12000, "sale": 18600, "icon": "🏗️"},
 {"id": "vehicles", "name": "PKW / Nutzfahrzeuge", "type": "heavy", "purchase": 18000, "sale": 27900, "icon": "🏗️"},
 {"id": "scrapMetal", "name": "Metallschrott", "type": "heavy", "purchase": 220, "sale": 341, "icon": "🏗️"},
 {"id": "water", "name": "Trinkwasser", "type": "liquid", "purchase": 8, "sale": 12, "icon": "💧"},
 {"id": "beer", "name": "Bier (Tank)", "type": "liquid", "purchase": 900, "sale": 1395, "icon": "💧"},
 {"id": "wine", "name": "Wein (Tank)", "type": "liquid", "purchase": 2200, "sale": 3410, "icon": "💧"},
 {"id": "vegetableOil", "name": "Pflanzenöl", "type": "liquid", "purchase": 1000, "sale": 1550, "icon": "💧"},
 {"id": "molasses", "name": "Melasse", "type": "liquid", "purchase": 150, "sale": 232, "icon": "💧"},
 {"id": "crudeOil", "name": "Rohöl", "type": "hazardous", "purchase": 450, "sale": 698, "icon": "⚠️"},
 {"id": "diesel", "name": "Diesel", "type": "hazardous", "purchase": 900, "sale": 1395, "icon": "⚠️"},
 {"id": "petrol", "name": "Benzin", "type": "hazardous", "purchase": 1050, "sale": 1628, "icon": "⚠️"},
 {"id": "kerosene", "name": "Kerosin", "type": "hazardous", "purchase": 950, "sale": 1472, "icon": "⚠️"},
 {"id": "chemicals", "name": "Industriechemikalien", "type": "hazardous", "purchase": 1500, "sale": 2325, "icon": "⚠️"},
 {"id": "solvents", "name": "Lösungsmittel", "type": "hazardous", "purchase": 1700, "sale": 2635, "icon": "⚠️"},
 {"id": "industrialGases", "name": "Industriegase", "type": "hazardous", "purchase": 1900, "sale": 2945, "icon": "⚠️"},
 {"id": "antibiotics", "name": "Antibiotika", "type": "pharma", "purchase": 28000, "sale": 43400, "icon": "💊"},
 {"id": "painkillers", "name": "Schmerzmittel", "type": "pharma", "purchase": 19000, "sale": 29450, "icon": "💊"},
 {"id": "insulin", "name": "Insulin", "type": "pharma", "purchase": 42000, "sale": 65100, "icon": "💊"},
 {"id": "vaccines", "name": "Impfstoffe", "type": "pharma", "purchase": 65000, "sale": 100750, "icon": "💊"},
 {"id": "infusions", "name": "Infusionslösungen", "type": "pharma", "purchase": 8500, "sale": 13175, "icon": "💊"},
 {"id": "medicalOxygen", "name": "Medizinischer Sauerstoff", "type": "pharma", "purchase": 3800, "sale": 5890, "icon": "💊"},
 {"id": "cattle", "name": "Rinder", "type": "livestock", "purchase": 1800, "sale": 2790, "icon": "🐄"},
 {"id": "pigs", "name": "Schweine", "type": "livestock", "purchase": 1600, "sale": 2480, "icon": "🐄"},
 {"id": "livePoultry", "name": "Lebendgeflügel", "type": "livestock", "purchase": 1400, "sale": 2170, "icon": "🐄"}
];
GOODS.push(...extraGoods as Good[]);
for(const g of GOODS){g.purchase/=10;g.sale/=10;}
export const good=(id:GoodId)=>GOODS.find(g=>g.id===id)!;
export interface Recipe {id:string;name:string;output:GoodId;yield:number;inputs:Partial<Record<GoodId,number>>;fee:number}
export const RECIPES:Recipe[]=[
 {id:'flour',name:'Weizen zu Mehl',output:'flour',yield:.77,inputs:{wheat:1},fee:45},
 {id:'bread',name:'Mehl zu Brot',output:'bread',yield:1.25,inputs:{flour:1},fee:95},
 {id:'pastry',name:'Gebäckproduktion',output:'pastry',yield:1.1,inputs:{flour:.8,milk:.2},fee:160},
 {id:'biscuits',name:'Keksproduktion',output:'biscuits',yield:1.15,inputs:{flour:.85,milk:.15},fee:115},
 {id:'lumber',name:'Rundholz zu Schnittholz',output:'lumber',yield:.7,inputs:{timber:1},fee:50},
 {id:'steel',name:'Erz zu Stahl',output:'steel',yield:.63,inputs:{ironOre:1},fee:130},
 {id:'electronics',name:'Elektronikfertigung',output:'electronics',yield:.8,inputs:{rareEarth:.3,steel:.7},fee:370},
 {id:'packaging',name:'Verpackungsproduktion',output:'packaging',yield:1.1,inputs:{timber:1},fee:85},
 {"id": "sugar", "name": "Zuckerraffination", "output": "sugar", "inputs": {"sugarBeet": 1}, "fee": 35, "yield": 0.17},
 {"id": "malt", "name": "Mälzen", "output": "malt", "inputs": {"barley": 1}, "fee": 65, "yield": 0.82},
 {"id": "feed", "name": "Futtermischung", "output": "animalFeed", "inputs": {"corn": 0.6, "soy": 0.4}, "fee": 40, "yield": 1},
 {"id": "cheese", "name": "Käserei", "output": "cheese", "inputs": {"milk": 1}, "fee": 80, "yield": 0.12},
 {"id": "butter", "name": "Butterei", "output": "butter", "inputs": {"milk": 1}, "fee": 60, "yield": 0.05},
 {"id": "yogurt", "name": "Joghurt herstellen", "output": "yogurt", "inputs": {"milk": 0.95, "sugar": 0.05}, "fee": 90, "yield": 1},
 {"id": "pasta", "name": "Pastaproduktion", "output": "pasta", "inputs": {"flour": 0.9, "eggs": 0.1}, "fee": 130, "yield": 1.1},
 {"id": "chocolate", "name": "Schokoladenfertigung", "output": "chocolate", "inputs": {"cocoa": 0.45, "sugar": 0.35, "milk": 0.2}, "fee": 400, "yield": 1},
 {"id": "coffee", "name": "Kaffee rösten", "output": "roastedCoffee", "inputs": {"coffeeBeans": 1}, "fee": 250, "yield": 0.82},
 {"id": "juice", "name": "Fruchtsaft", "output": "freshJuice", "inputs": {"apples": 1}, "fee": 110, "yield": 0.65},
 {"id": "beer", "name": "Brauerei", "output": "beer", "inputs": {"malt": 0.15, "water": 0.85}, "fee": 95, "yield": 1},
 {"id": "wine", "name": "Weinkelterei", "output": "wine", "inputs": {"grapes": 1}, "fee": 180, "yield": 0.7},
 {"id": "paper", "name": "Papierproduktion", "output": "paper", "inputs": {"timber": 0.9, "water": 0.1}, "fee": 120, "yield": 0.7},
 {"id": "cardboard", "name": "Kartonfertigung", "output": "cardboard", "inputs": {"paper": 1}, "fee": 70, "yield": 0.95},
 {"id": "glass", "name": "Glasschmelze", "output": "glass", "inputs": {"sand": 0.75, "limestone": 0.25}, "fee": 140, "yield": 0.9},
 {"id": "bottles", "name": "Flaschenfertigung", "output": "bottles", "inputs": {"glass": 1}, "fee": 85, "yield": 0.96},
 {"id": "cement", "name": "Zementwerk", "output": "cement", "inputs": {"limestone": 0.8, "sand": 0.2}, "fee": 60, "yield": 0.75},
 {"id": "concrete", "name": "Betonfertigteile", "output": "concreteElements", "inputs": {"cement": 0.2, "gravel": 0.5, "sand": 0.2, "water": 0.1}, "fee": 40, "yield": 1},
 {"id": "aluminium", "name": "Aluminiumhütte", "output": "aluminium", "inputs": {"bauxite": 1}, "fee": 350, "yield": 0.4},
 {"id": "copper", "name": "Kupferhütte", "output": "copper", "inputs": {"copperOre": 1}, "fee": 450, "yield": 0.35},
 {"id": "coils", "name": "Stahlcoils walzen", "output": "steelCoils", "inputs": {"steel": 1}, "fee": 130, "yield": 0.96},
 {"id": "beams", "name": "Stahlträger walzen", "output": "steelBeams", "inputs": {"steel": 1}, "fee": 140, "yield": 0.97},
 {"id": "furniture", "name": "Möbelfertigung", "output": "furniture", "inputs": {"lumber": 0.85, "steel": 0.15}, "fee": 320, "yield": 0.8},
 {"id": "textiles", "name": "Weberei", "output": "textiles", "inputs": {"cotton": 1}, "fee": 250, "yield": 0.9},
 {"id": "clothing", "name": "Bekleidungsfertigung", "output": "clothing", "inputs": {"textiles": 1}, "fee": 600, "yield": 0.8},
 {"id": "plastic", "name": "Kunststoffgranulat", "output": "plasticGranules", "inputs": {"chemicals": 1}, "fee": 180, "yield": 0.85},
 {"id": "tires", "name": "Reifenfertigung", "output": "tires", "inputs": {"rubber": 0.7, "steel": 0.15, "chemicals": 0.15}, "fee": 350, "yield": 0.95},
 {"id": "batteries", "name": "Batteriefertigung", "output": "batteries", "inputs": {"lithium": 0.35, "copper": 0.25, "aluminium": 0.4}, "fee": 1100, "yield": 0.9},
 {"id": "solar", "name": "Solarfertigung", "output": "solarPanels", "inputs": {"glass": 0.5, "aluminium": 0.3, "electronics": 0.2}, "fee": 700, "yield": 0.92},
 {"id": "computers", "name": "Computermontage", "output": "computers", "inputs": {"electronics": 0.6, "plasticGranules": 0.25, "copper": 0.15}, "fee": 1400, "yield": 0.95},
 {"id": "medicals", "name": "Medizinischer Verbrauchsbedarf", "output": "medicalSupplies", "inputs": {"plasticGranules": 0.6, "textiles": 0.4}, "fee": 500, "yield": 0.96},
 {"id": "bandages", "name": "Verbandmaterial herstellen", "output": "bandages", "inputs": {"textiles": 1}, "fee": 450, "yield": 0.95},
 {"id": "syringes", "name": "Spritzenfertigung", "output": "syringes", "inputs": {"plasticGranules": 0.85, "steel": 0.15}, "fee": 700, "yield": 0.92},
 {"id": "antibiotics", "name": "Antibiotika – Spielrezept", "output": "antibiotics", "inputs": {"chemicals": 0.8, "packaging": 0.2}, "fee": 1800, "yield": 0.8},
 {"id": "painkillers", "name": "Schmerzmittel – Spielrezept", "output": "painkillers", "inputs": {"chemicals": 0.85, "packaging": 0.15}, "fee": 1400, "yield": 0.9},
 {"id": "insulin", "name": "Insulin – Spielrezept", "output": "insulin", "inputs": {"chemicals": 0.7, "water": 0.2, "packaging": 0.1}, "fee": 3200, "yield": 0.65},
 {"id": "vaccines", "name": "Impfstoff – Spielrezept", "output": "vaccines", "inputs": {"chemicals": 0.6, "water": 0.2, "packaging": 0.2}, "fee": 4200, "yield": 0.55},
 {"id": "infusions", "name": "Infusionslösungen – Spielrezept", "output": "infusions", "inputs": {"water": 0.8, "salt": 0.05, "packaging": 0.15}, "fee": 700, "yield": 1},
 {"id": "oxygen", "name": "Medizinischer Sauerstoff (Abfüllung)", "output": "medicalOxygen", "inputs": {"industrialGases": 1}, "fee": 250, "yield": 0.95},
 {"id": "beef", "name": "Rindfleischverarbeitung", "output": "beef", "inputs": {"cattle": 1}, "fee": 200, "yield": 0.55},
 {"id": "pork", "name": "Schweinefleischverarbeitung", "output": "pork", "inputs": {"pigs": 1}, "fee": 180, "yield": 0.7},
 {"id": "poultry", "name": "Geflügelverarbeitung", "output": "poultry", "inputs": {"livePoultry": 1}, "fee": 160, "yield": 0.68},
 {"id": "recycle", "name": "Metallrecycling", "output": "steel", "inputs": {"scrapMetal": 1}, "fee": 160, "yield": 0.8},
 {"id": "diesel", "name": "Dieselraffination", "output": "diesel", "inputs": {"crudeOil": 1}, "fee": 160, "yield": 0.5},
 {"id": "petrol", "name": "Benzinraffination", "output": "petrol", "inputs": {"crudeOil": 1}, "fee": 190, "yield": 0.48},
 {"id": "kerosene", "name": "Kerosinraffination", "output": "kerosene", "inputs": {"crudeOil": 1}, "fee": 220, "yield": 0.42}
];
RECIPES.push(...extraRecipes as Recipe[]);
for(const r of RECIPES)r.fee/=10;
export const WAGONS=REAL_WAGONS;
export type WagonId=string;
export interface WagonSet {type:WagonId;count:number}
export const VEHICLES=REAL_VEHICLES;
export type VehicleModelId=string;
export const BUILDINGS:{id:BuildingKind;name:string;price:number;capacity:number;icon:string}[]=[
 {id:'depot',name:'Straßendepot',price:180000,capacity:80,icon:'🚚'},
 {id:'railDepot',name:'Zugdepot / Werkstatt',price:950000,capacity:500,icon:'🛠️'},
 {id:'railStation',name:'Güterbahnhof',price:1550000,capacity:1000,icon:'🚉'},
 {id:'shipDepot',name:'Schiffsdepot / Werft',price:2100000,capacity:600,icon:'🛠️'},
 {id:'airDepot',name:'Flugzeugdepot / Hangar',price:2300000,capacity:300,icon:'🛠️'},
 {id:'inlandPort',name:'Binnenhafen mit Liegeplatz',price:2800000,capacity:10000,icon:'🚢'},
 {id:'port',name:'Frachthafen',price:4800000,capacity:50000,icon:'⚓'},
 {id:'airport',name:'Frachtflughafen mit Hangar',price:12500000,capacity:15000,icon:'✈️'},
 {id:'hub',name:'Umschlagplatz',price:430000,capacity:650,icon:'🔄'},
 {id:'warehouse',name:'Großes Lager / Verteilzentrum',price:620000,capacity:3200,icon:'🏬'},
];
BUILDINGS.push({id:'warehouseSmall',name:'Kleines Lager',price:85000,capacity:120,icon:'📦'},{id:'warehouseMedium',name:'Mittleres Lager',price:240000,capacity:800,icon:'🏚️'},{id:'warehouseXL',name:'Logistikzentrum XL',price:1600000,capacity:10000,icon:'🏢'});
for(const b of BUILDINGS)b.capacity*=10;
export type Coords=[number,number];
export interface Site {adminOverride?:boolean;businessRole?:'supplier'|'processor'|'buyer';sourceName?:string;sourceKind?:SiteType;hidden?:boolean;demandOverride?:Record<string,number>;warehouseLevel?:number;grid?:BuildGrid;id:string;name:string;lat:number;lon:number;kind:SiteType;osmUrl?:string;tags?:Record<string,string>;owned?:boolean;cooperative?:boolean;operatorId?:string}
export interface Profile {production:Partial<Record<GoodId,number>>;recipes:string[];demand:GoodId[];capacity:number}
export function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export type BusinessRole='supplier'|'processor'|'buyer';
function assignedRole(site:Site,p:Profile):BusinessRole|null{if(site.hidden)return null;const options:BusinessRole[]=[];if(Object.keys(p.production).length)options.push('supplier');if(p.recipes.length)options.push('processor');if(p.demand.length)options.push('buyer');if(site.businessRole&&(site.businessRole==='buyer'||options.includes(site.businessRole)))return site.businessRole;if(site.demandOverride!==undefined)return 'buyer';return options.length?options[stableHash(site.id+'/business-role')%options.length]:null;}
export function businessRoleOptions(site:Site):BusinessRole[]{const p=baseProfile(site);return [...(Object.keys(p.production).length?['supplier' as const]:[]),...(p.recipes.length?['processor' as const]:[]),'buyer'];}
export function operatingRole(site:Site){return assignedRole(site,baseProfile(site));}
export function profile(site:Site):Profile {const p=baseProfile(site),role=assignedRole(site,p);return {production:role==='supplier'?p.production:{},recipes:role==='processor'?p.recipes:[],demand:role==='buyer'?(site.demandOverride!==undefined?Object.keys(site.demandOverride):p.demand):[],capacity:p.capacity};}
function baseProfile(site:Site):Profile {
 const retail=RETAIL[site.kind];if(retail)return {production:{},recipes:[],demand:retail.goods,capacity:retail.capacity};
 const f=.72+(hash(site.id)%90)/100,base=(n:number)=>Math.max(1,Math.round(n*f))*10;
 switch(site.kind){
 case 'hospital':return {production:{},recipes:[],demand:['antibiotics','painkillers','insulin','vaccines','infusions','medicalOxygen','medicalSupplies','bandages','syringes','cleaners'],capacity:base(18)};
 case 'pharmacy':return {production:{},recipes:[],demand:['antibiotics','painkillers','insulin','vaccines','bandages','medicalSupplies'],capacity:base(3)};
 case 'chemical':return {production:{chemicals:base(20),industrialGases:base(8)},recipes:['antibiotics','painkillers','insulin','vaccines','infusions','oxygen','plastic','medicals','bandages','syringes'],demand:[],capacity:base(90)};
 case 'oilWell':return {production:{crudeOil:base(45)},recipes:[],demand:[],capacity:base(180)};
 case 'refinery':return {production:{},recipes:['diesel','petrol','kerosene'],demand:[],capacity:base(180)};
 case 'forestry':return {production:{timber:base(50)},recipes:[],demand:[],capacity:base(90)};
 case 'sawmill':return {production:{},recipes:['lumber','paper','packaging'],demand:[],capacity:base(90)};
 case 'recycling':return {production:{scrapMetal:base(24)},recipes:['recycle'],demand:['scrapMetal','paper','glass','plasticGranules'],capacity:base(100)};
 case 'dairy':return {production:{},recipes:['cheese','butter','yogurt'],demand:[],capacity:base(60)};
 case 'beverage':return {production:{water:base(40)},recipes:['juice','beer','wine'],demand:[],capacity:base(80)};
 case 'slaughterhouse':return {production:{},recipes:['beef','pork','poultry'],demand:[],capacity:base(65)};
 case 'automotive':return {production:{},recipes:['tires','batteries','computers',...RECIPES.filter(r=>r.id.startsWith('auto-')).map(r=>r.id)],demand:[...extraGoods.filter(g=>!g.requiresHeavy).map(g=>g.id),'steelCoils','steelBeams','machineryParts','tires','batteries','glass','spareParts'],capacity:base(120)};
 case 'textile':return {production:{},recipes:['textiles','clothing','bandages'],demand:[],capacity:base(50)};
 case 'construction':return {production:{},recipes:[],demand:['transformer','excavator','craneModule','bridgeGirder','cement','sand','gravel','concreteElements','steelBeams','lumber','bricks','glass'],capacity:base(180)};
 case 'wholesale':return {production:{},recipes:[],demand:['bread','milk','apples','vegetables','potatoes','eggs','cheese','butter','yogurt','pasta','cannedFood','chocolate','roastedCoffee','frozenFood','freshJuice','soap','cleaners','clothing','footwear','furniture','electronics','computers','packaging','books','stationery','petFood'],capacity:base(95)};
 case 'farm':return {production:{cutFlowers:base(2),wheat:base(24),corn:base(15),milk:base(9),apples:base(7),barley:base(15),potatoes:base(18),vegetables:base(10),eggs:base(3),sugarBeet:base(25),soy:base(12),grapes:base(7),cattle:base(4),pigs:base(5),livePoultry:base(3)},recipes:[],demand:[],capacity:0};
 case 'mine':return {production:{ironOre:base(55),rareEarth:base(3),coal:base(30),bauxite:base(25),copperOre:base(15),lithium:base(4),limestone:base(60),salt:base(20),sand:base(45),gravel:base(45)},recipes:[],demand:[],capacity:0};
 case 'mill':return {production:{},recipes:['flour','malt','feed'],demand:[],capacity:base(46)};
 case 'bakery':return {production:{},recipes:['bread','pastry','biscuits'],demand:[],capacity:base(24)};
 case 'factory':return {production:{},recipes:factoryRecipes(site,RECIPES),demand:[],capacity:base(125)};
 case 'supermarket':return {production:{},recipes:[],demand:['bread','pastry','biscuits','apples','milk','flour','vegetables','potatoes','eggs','cheese','butter','yogurt','pasta','cannedFood','chocolate','roastedCoffee','frozenFood','freshJuice','soap','cleaners'],capacity:base(25)};
 case 'restaurant':return {production:{},recipes:[],demand:['bread','pastry','milk','apples','flour','vegetables','potatoes','eggs','beef','pork','poultry','fish','cheese','pasta','roastedCoffee','freshJuice'],capacity:base(7)};
 case 'dealer':return {production:{},recipes:[],demand:['lumber','steel','electronics','packaging','furniture','textiles','clothing','spareParts','machines','batteries','solarPanels','computers'],capacity:base(16)};
 case 'warehouse':return {production:{},recipes:[],demand:[],capacity:0};
 default:return {production:{},recipes:[],demand:[],capacity:0};
 }
}
export function identifyPartner(tags:Record<string,string>):PartnerKind|null {
 if(excludedBusiness(tags))return null;const retail=retailKind(tags);if(retail)return retail as PartnerKind;
 if(tags.disused==='yes'||tags.abandoned==='yes'||/^ehemalig|^former /.test((tags.name||'').toLowerCase()))return null;
 const shop=tags.shop||'',craft=tags.craft||'',ind=(tags.industrial||'').toLowerCase(),name=(tags.name||'').toLowerCase(),landuse=tags.landuse||'',amenity=tags.amenity||'';
 if(['hospital','clinic','doctors','dentist','veterinary','nursing_home','social_facility'].includes(amenity)||tags.healthcare==='hospital')return 'hospital';
 if(shop==='chemist'||amenity==='pharmacy'||tags.healthcare==='pharmacy')return 'pharmacy';
 if(ind.includes('pharma')||ind.includes('chemical'))return 'chemical';
 if(tags.man_made==='petroleum_well')return 'oilWell';if(ind.includes('refinery'))return 'refinery';
 if(ind.includes('dairy')||craft==='dairy')return 'dairy';
 if(ind.includes('brewery')||ind.includes('winery')||craft==='brewery'||craft==='winery')return 'beverage';
 if(ind.includes('slaughter')||tags.industrial==='meat')return 'slaughterhouse';
 if(ind.includes('automotive')||shop==='car'||craft==='car_repair')return 'automotive';
 if(ind.includes('textile')||craft==='tailor')return 'textile';
 if(amenity==='recycling'||ind.includes('recycling')||tags.landuse==='landfill')return 'recycling';
 if(shop==='wholesale')return 'wholesale';
 if(shop==='building_materials'||craft==='builder')return 'construction';
 if(craft==='sawmill'||ind.includes('sawmill')||ind.includes('saw_mill'))return 'sawmill';if(tags.landuse==='forest'&&tags.operator||tags.forestry==='yes'||['forestry','forest_management'].includes(tags.office||''))return 'forestry';
 if(['farm','farmyard','agricultural'].includes(shop)||['farmyard'].includes(landuse)||tags.farm||tags.produce||tags['agriculture'])return 'farm';
 if(['quarry'].includes(landuse)||['mineshaft','adit'].includes(tags.man_made||'')||ind.includes('mine')||ind.includes('quarry'))return 'mine';
 if(['mill','flour_mill'].includes(craft)||ind.includes('mill')||((tags.man_made==='works'||landuse==='industrial')&&/mühle|milling/.test(name)))return 'mill';
 if(['bakery','pastry'].includes(shop)||craft==='bakery'||/großbäckerei|grossbäckerei/.test(name))return 'bakery';
 if(['supermarket','convenience','grocery','department_store','newsagent','kiosk'].includes(shop))return 'supermarket';
 if(['restaurant','cafe','fast_food','pub','bar'].includes(amenity))return 'restaurant';
 if(['hardware','furniture','car_parts','electronics','wholesale','trade','building_materials'].includes(shop))return 'dealer';
 if(tags.building==='warehouse'||ind==='logistics'||ind==='warehouse')return 'warehouse';
 if(tags.man_made==='works'||ind||craft==='sawmill'||craft==='metal_construction'||(landuse==='industrial'&&tags.name))return 'factory';
 if(shop||craft||tags.office||['fuel','bank','marketplace'].includes(amenity))return 'wholesale';
 return null;
}
export const isWarehouse=(site:Site)=>site.owned&&['warehouse','warehouseSmall','warehouseMedium','warehouseXL'].includes(site.kind);
export const storageCapacity=(site:Site)=>{const spec=BUILDINGS.find(b=>b.id===site.kind);return site.owned||site.cooperative?(spec?.capacity||0)*(site.kind.startsWith('warehouse')?1+((site.warehouseLevel||1)-1)*.75:1):(site.kind==='factory'?800:site.kind==='mill'?220:site.kind==='bakery'?170:site.kind==='warehouse'?2400:10000)*10;};
export function warehouseUpgrade(s:State,siteId:string,confirmed=false){const site=s.sites.find(p=>p.id===siteId);if(!site||!isWarehouse(site))throw Error('Ein eigenes Lager auswählen.');const level=site.warehouseLevel||1;if(level>=5)throw Error('Maximale Lagerstufe erreicht.');const price=Math.round(BUILDINGS.find(b=>b.id===site.kind)!.price*(.6+level*.25));if(!confirmed)throw Error('Lagerausbau muss bestätigt werden.');debit(s,price,'Bau & Ausbau');site.warehouseLevel=level+1;log(s,site.name+' auf Stufe '+site.warehouseLevel+' ausgebaut.','good');return site;}
export const kindName={...Object.fromEntries(Object.entries(RETAIL).map(([id,r])=>[id,r.name])),oilWell:'Ölförderstelle',farm:'Landwirtschaft',mine:'Bergwerk',mill:'Mühle',bakery:'Bäckerei',factory:'Fabrik',supermarket:'Geschäft',restaurant:'Lokal',dealer:'Händler',warehouse:'Lager',depot:'Straßendepot',railDepot:'Güterbahnhof',inlandPort:'Binnenhafen',port:'Hafen',airport:'Frachtflughafen mit Hangar',hub:'Umschlagplatz',hospital:"Krankenhaus / Klinik",pharmacy:"Apotheke",chemical:"Chemie / Pharma",refinery:"Raffinerie",forestry:"Forstbetrieb",sawmill:"Sägewerk",recycling:"Recycling",dairy:"Molkerei",beverage:"Getränkehersteller",slaughterhouse:"Fleischverarbeitung",automotive:"Fahrzeugindustrie",textile:"Textilbetrieb",construction:"Baustoffhandel",wholesale:"Großhandel",warehouseSmall:"Kleines Lager",warehouseMedium:"Mittleres Lager",warehouseXL:"Logistikzentrum XL",railStation:"Güterbahnhof",shipDepot:"Schiffsdepot",airDepot:"Flugzeugdepot"} as Record<SiteType,string>;
export const kindIcon={...Object.fromEntries(Object.entries(RETAIL).map(([id,r])=>[id,r.icon])),oilWell:'🛢️',farm:'🌾',mine:'⛏️',mill:'🏭',bakery:'🥖',factory:'🏭',supermarket:'🛒',restaurant:'🍽️',dealer:'🏪',warehouse:'📦',depot:'🚚',railDepot:'🚆',inlandPort:'🚢',port:'⚓',airport:'✈️',hub:'🔄',hospital:"🏥",pharmacy:"💊",chemical:"⚗️",refinery:"🛢️",forestry:"🌲",sawmill:"🪚",recycling:"♻️",dairy:"🥛",beverage:"🍺",slaughterhouse:"🥩",automotive:"🚗",textile:"🧵",construction:"🧱",wholesale:"📦",warehouseSmall:"📦",warehouseMedium:"🏚️",warehouseXL:"🏢",railStation:"🚉",shipDepot:"🛠️",airDepot:"🛠️"} as Record<SiteType,string>;
export interface Contract {deadlineRulesVersion?:15;completedDay?:number;reservationBillingDay?:number;productionDay?:number;processedToday?:number;cancelled?:boolean;id:string;kind:'supply'|'process'|'sale'|'haulage';siteId:string;destinationId?:string;good?:GoodId;recipeId?:string;daily:number;startDay:number;endDay:number;delivered:number;paid:number;loadedToday:number;deliveredToday:number;fee:number;total?:number;}
export interface Stop {manualDeparture?:boolean;orderIds?:string[];good?:string;siteId:string;action:'load'|'unload'|'transfer'|'sell';quantity:number}
export interface Cargo {loadedAtId?:string;good:GoodId;quantity:number;orderId?:string;legacyCapacity?:number}
export interface Vehicle {servicePlan?:ServicePlan;manualHold?:{lineId:string;siteId:string;index:number};manualReleased?:{lineId:string;siteId:string;index:number;readyAfterDay?:number;loadedQuantity?:number;goods:GoodId[]|'all'};manualDepartureReady?:boolean;manualGoods?:GoodId[]|'all';cycleDelivered?:number;detaching?:boolean;waitingForCargo?:boolean;handlingRulesVersion?:15;containerOrderIds?:string[];handlingUntil?:number;returnLineId?:string;onReturnRoute?:boolean;currentStop?:Stop;restartAfterStop?:boolean;dailyRestTargetId?:string;dailyRestReturning?:boolean;purchasedAt?:number;statisticsSince?:number;odometerKm?:number;transportedEh?:number;legRecordedKm?:number;name?:string;otherCargo?:Cargo[];homeDepotId?:string;currentLeg?:RouteLeg;waitingRoute?:boolean;pendingLineId?:string|null;scheduleDay?:number;tripsToday?:number;tripsTotal?:number;restUntil?:number;restReason?:string;departDay?:number;id:string;modelId:VehicleModelId;cooling?:boolean;trailerId?:string;wagons?:WagonSet[];lineId?:string;locationId:string;nextStop:number;etaDay?:number;targetId?:string;status:'idle'|'enroute'|'returning';cargo?:Cargo}
export interface RouteLeg {durationHours?:number;accessFallback?:boolean;geometryVersion?:2;fromId:string;toId:string;km:number;path:Coords[];source:'eigene-gleise'|'osm-strassen'|'luftlinie'|'naeherung';}
export interface Line {manualDeparture?:boolean;inland?:boolean;completedVehicleIds?:string[];deleted?:boolean;stopWhenDemandMet?:boolean;stopWhenSourcesEmpty?:boolean;tripsPerDay?:number|null;tripLimit?:number|null;legs?:RouteLeg[];id:string;name:string;mode:Mode;good:GoodId;stops:Stop[];startDay:number;endDay:number|null;active:boolean;}
export interface Track {id:string;from:Coords;to:Coords;km:number}
export interface Event {day:number;text:string;type:'good'|'warn'|'info'}
export interface State {terminalTransfers?:TerminalTransfer[];dailyEconomy?:{day:number;sources:Record<string,Partial<Record<GoodId,number>>>;processing:Record<string,number>};finance?:FinanceBook;roadRoutes?:RouteLeg[];localMarket?:DailyMarket;version:1;quantityUnit?:'EH';freightRulesVersion?:2;live?:boolean;companyName?:string;day:number;cash:number;earned:number;spent:number;sites:Site[];inventory:Record<string,Partial<Record<GoodId,number>>>;consignments:Record<string,Record<string,number>>;contracts:Contract[];lines:Line[];vehicles:Vehicle[];tracks:Track[];borrowedTracks?:Track[];events:Event[];}
export const newState=():State=>({version:1,quantityUnit:'EH',freightRulesVersion:2,day:1,cash:5500000,earned:0,spent:0,sites:[],inventory:{},consignments:{},contracts:[],lines:[],vehicles:[],tracks:[],events:[{day:1,text:'Willkommen bei Weltverbund Logistik. Echte Firmen laden und erste Lieferkette aufbauen.',type:'info'}]});
export function log(s:State,text:string,type:Event['type']='info'){s.events=[{day:s.day,text,type},...s.events].slice(0,90)}
export function credit(s:State,n:number,category?:string){recordFinance(s,n,true,category);s.cash+=n;s.earned+=n;}
export function debit(s:State,n:number,category?:string){if(s.cash<n)throw Error('Nicht genügend Kapital.');recordFinance(s,n,false,category);s.cash-=n;s.spent+=n;}
const rid=()=>Math.random().toString(36).slice(2,11);
export function mergeSites(s:State,sites:Site[]){const known=new Set(s.sites.map(v=>v.id));for(const v of sites)if(!known.has(v.id)){s.sites.push(v);known.add(v.id);} }
export function stock(s:State,site:string,product:GoodId){return s.inventory[site]?.[product]||0;}
function lot(s:State,site:string,order:string){return s.consignments?.[site]?.[order]||0;}
function setLot(s:State,site:string,order:string,qty:number){s.consignments??={};s.consignments[site]??={};s.consignments[site][order]=Math.round(Math.max(0,qty)*1000000)/1000000;}
function setStock(s:State,site:string,product:GoodId,qty:number){s.inventory[site]??={};s.inventory[site][product]=Math.round(Math.max(0,qty)*1000000)/1000000;}
/** Issued daily quantities survive contract cancellation/replacement and line edits.
 * Migrate existing saves without creating a fresh batch on the first request. */
function dailyEconomy(s:State){
 const day=Math.floor(s.day);
 if(!s.dailyEconomy){
  s.dailyEconomy={day,sources:{},processing:{}};
  for(const c of s.contracts){
   if(c.kind==='supply'&&c.good&&(c.productionDay===undefined||c.productionDay>=day)){
    const row=s.dailyEconomy.sources[c.siteId]??={};row[c.good]=(row[c.good]||0)+c.daily;
   }
   if(c.kind==='process')s.dailyEconomy.processing[c.siteId]=(s.dailyEconomy.processing[c.siteId]||0)+(c.processedToday||0);
  }
 }else if(day>s.dailyEconomy.day)s.dailyEconomy={day,sources:{},processing:{}};
 return s.dailyEconomy;
}
const siteById=(s:State,id:string)=>s.sites.find(x=>x.id===id);
export function kmBetween(a:Coords,b:Coords){const rad=Math.PI/180,dl=(b[1]-a[1])*rad,dφ=(b[0]-a[0])*rad,h=Math.sin(dφ/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dl/2)**2;return 12742*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
export function distanceSites(a:Site,b:Site){return kmBetween([a.lat,a.lon],[b.lat,b.lon]);}
export function contractDuration(s:State,site:string,goodId:string){return 30+hash(`${site}/${goodId}/${s.day}/${s.contracts.length}`)%336;}
export function signSupply(s:State,siteId:string,goodId:GoodId,daily:number){const site=siteById(s,siteId);if(!site||site.owned||site.hidden)throw Error('Einen echten Lieferanten auswählen.');const capacity=profile(site).production[goodId]||0;const already=s.contracts.filter(c=>c.kind==='supply'&&c.siteId===siteId&&c.good===goodId&&!c.cancelled&&c.endDay>=s.day).reduce((n,c)=>n+c.daily,0);if(!capacity||!Number.isFinite(daily)||daily<=0||daily+already>capacity)throw Error(`Nur ${Math.max(0,capacity-already)} EH/Tag verfügbar.`);const c:Contract={id:rid(),kind:'supply',siteId,good:goodId,daily,startDay:s.day,endDay:s.day+180,delivered:0,paid:0,loadedToday:0,deliveredToday:0,fee:good(goodId).purchase};const ledger=dailyEconomy(s),issued=ledger.sources[siteId]?.[goodId]||0;const fresh=Math.max(0,already+daily-issued);const price=Math.round(fresh*c.fee*100)/100;debit(s,price,'Warenreservierungen');c.paid=price;c.reservationBillingDay=Math.floor(s.day);s.contracts.push(c);c.productionDay=Math.floor(s.day);const quantities=ledger.sources[siteId]??={};quantities[goodId]=issued+fresh;setStock(s,siteId,goodId,stock(s,siteId,goodId)+fresh);log(s,`Abnahmevertrag: ${site.name} · ${good(goodId).name} ${daily} EH/Tag`,'good');return c;}
export function signProcess(s:State,siteId:string,recipeId:string,daily:number){const site=siteById(s,siteId);const p=site&&profile(site),recipe=RECIPES.find(r=>r.id===recipeId);if(!site||site.hidden||!p||!recipe||!p.recipes.includes(recipeId))throw Error('An diesem Betrieb ist dieses Produkt nicht herstellbar.');const used=s.contracts.filter(c=>c.kind==='process'&&c.siteId===siteId&&!c.cancelled&&c.endDay>=s.day).reduce((n,c)=>n+c.daily,0);if(!Number.isFinite(daily)||daily<=0||daily+used>p.capacity)throw Error(`Verarbeitungslimit: Noch ${Math.max(0,p.capacity-used)} EH/Tag frei.`);const c:Contract={id:rid(),kind:'process',siteId,recipeId,good:recipe.output,daily,startDay:s.day,endDay:s.day+180,delivered:0,paid:0,loadedToday:0,deliveredToday:0,fee:recipe.fee};s.contracts.push(c);log(s,`Verarbeitungsvertrag: ${site.name} · ${recipe.name} ${daily} EH/Tag`,'good');return c;}
export function demandFor(site:Site){const p=profile(site);return p.demand.length?fixedDemand(site,p.demand,p.capacity):{};}
export function cancelContract(s:State,id:string){const c=s.contracts.find(c=>c.id===id);if(!c)throw Error('Vertrag nicht gefunden.');if(c.cancelled)throw Error('Vertrag bereits gekündigt.');c.cancelled=true;c.endDay=Math.min(c.endDay,s.day);log(s,'Vertrag gekündigt: '+(s.sites.find(p=>p.id===c.siteId)?.name||c.siteId),'info');}
export function renameBuilding(s:State,id:string,name:string){const site=s.sites.find(p=>p.id===id&&p.owned);if(!site)throw Error('Nur eigene Gebäude können umbenannt werden.');name=name.trim();if(name.length<2||name.length>80)throw Error('Gebäudename: 2–80 Zeichen.');site.name=name;}
export const VAN_COOLING_PRICE=6500;
export function signSale(s:State,siteId:string,goodId:GoodId,daily:number){const site=siteById(s,siteId);if(!site||!profile(site).demand.includes(goodId))throw Error('Dieser Abnehmer fragt das Gut nicht nach.');const cap=demandFor(site)[goodId]||0;const already=0;if(!Number.isFinite(daily)||daily<=0||daily+already>cap)throw Error(`Noch maximal ${Math.max(0,cap-already)} EH/Tag Nachfrage verfügbar.`);const duration=30+Math.floor(Math.random()*336);const c:Contract={id:rid(),kind:'sale',siteId,good:goodId,daily,startDay:s.day,endDay:s.day+duration,delivered:0,paid:0,loadedToday:0,deliveredToday:0,fee:good(goodId).sale};s.contracts.push(c);log(s,`Zuliefervertrag: ${site.name} · ${good(goodId).name} für ${duration} Tage`,'good');return c;}
export function haulageOffer(s:State,from:string,to:string){const a=siteById(s,from),b=siteById(s,to);if(!a||!b||a.id===b.id)return null;const km=distanceSites(a,b),period=Math.floor(s.day/60);return {quantity:(8+hash(`${from}>${to}/${period}`)%113)*10,fee:Math.round(180+km*.9)/10,expires:s.day+60};}
export function signHaulage(s:State,from:string,to:string,qty:number){const a=siteById(s,from),b=siteById(s,to);if(!a||!b||a.id===b.id||a.owned||b.owned||qty<=0||qty>1200||!Number.isFinite(qty))throw Error('Ungültiger Containertransport.');const distance=distanceSites(a,b);if(distance<2)throw Error('Ziel liegt zu nahe am Ursprung.');const offer=haulageOffer(s,from,to)!;if(qty>offer.quantity)throw Error(`Für diesen Zeitraum sind maximal ${offer.quantity} EH Containerfracht ausgeschrieben.`);if(s.contracts.some(c=>c.kind==='haulage'&&c.siteId===from&&c.destinationId===to&&c.endDay>=s.day))throw Error('Für diese Verbindung besteht bereits ein Containerauftrag.');const fee=offer.fee;const c:Contract={id:rid(),kind:'haulage',siteId:from,destinationId:to,good:'containers',daily:0,startDay:s.day,endDay:s.day+60,delivered:0,paid:0,loadedToday:0,deliveredToday:0,fee,total:qty};s.contracts.push(c);setStock(s,from,'containers',stock(s,from,'containers')+qty);setLot(s,from,c.id,lot(s,from,c.id)+qty);log(s,`Containerauftrag: ${a.name} → ${b.name}, ${qty} EH`,'good');return c;}
export function build(s:State,kind:BuildingKind,lat:number,lon:number,rotation=0){const spec=BUILDINGS.find(x=>x.id===kind);if(!spec||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180)throw Error('Ungültiger Bauplatz.');if(s.sites.filter(v=>v.owned).length>=150)throw Error('Maximale Anzahl eigener Gebäude erreicht.');const plan=placement([lat,lon],kind,rotation);[lat,lon]=plan.point;if(s.sites.some(x=>x.owned&&(x.grid?gridOverlaps(plan.grid,x.grid):kmBetween([lat,lon],[x.lat,x.lon])<.05)))throw Error('Diese Baukacheln sind bereits belegt.');debit(s,spec.price,'Bau & Ausbau');const site:Site={id:'own:'+rid(),name:`${spec.name} ${s.sites.filter(v=>v.owned).length+1}`,lat,lon,kind,grid:plan.grid,owned:true};s.sites.push(site);log(s,`${spec.name} errichtet · ${euro(spec.price)}`,'good');return site;}
export function addTrack(s:State,a:Coords,b:Coords){a=snapTrackEndpoint(s.tracks,a);b=snapTrackEndpoint(s.tracks,b);const km=kmBetween(a,b);if(km<.025||km>2000)throw Error('Gleisabschnitt: 25 m bis 2.000 km.');const price=Math.round(km*40000);debit(s,price,'Gleisbau');const track:Track={id:rid(),from:a,to:b,km};s.tracks.push(track);log(s,`${km.toFixed(1)} km Gleis gebaut · ${euro(price)}`,'good');return track;}
export const modeForBuilding=(kind:BuildingKind,mode:Mode)=>mode==='van'||mode==='truck'?kind==='depot':mode==='rail'?kind==='railDepot':mode==='ship'?['shipDepot','inlandPort','port'].includes(kind):['airport','airDepot'].includes(kind);
export const MAX_FLEET_VEHICLES=10000,MAX_FLEET_PURCHASE=250;
export function vehicleDepotCompatible(kind:BuildingKind,model:typeof VEHICLES[number]){return model.mode==='ship'?model.inland?['inlandPort','port'].includes(kind):kind==='shipDepot':modeForBuilding(kind,model.mode);}
export function depotFor(s:State,mode:Mode,point?:Site){return s.sites.filter(x=>x.owned&&modeForBuilding(x.kind as BuildingKind,mode)).sort((a,b)=>point?distanceSites(a,point)-distanceSites(b,point):0)[0];}
export function addTrackPlan(s:State,points:Coords[]){if(!Array.isArray(points)||points.length<2||points.length>201||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))||Math.abs(p[0])>85||Math.abs(p[1])>180))throw Error('2–201 gültige Gleispunkte auswählen.');const copy=structuredClone(s);for(let i=1;i<points.length;i++)addTrack(copy,points[i-1],points[i]);Object.assign(s,copy);}

export function purchaseVehicle(s:State,modelId:VehicleModelId,trailerId?:string,depotId?:string,wagonSets?:WagonSet[],cooling=false){const spec=VEHICLES.find(v=>v.id===modelId);if(!spec)throw Error('Unbekanntes Fahrzeug.');if(cooling&&spec.mode!=='van')throw Error('Ein Kühlaggregat ist nur für Kastenwagen vorgesehen.');const depot=depotId?s.sites.find(p=>p.id===depotId&&p.owned&&vehicleDepotCompatible(p.kind as BuildingKind,spec)):s.sites.find(p=>p.owned&&vehicleDepotCompatible(p.kind as BuildingKind,spec));if(!depot)throw Error('Zuerst ein geeignetes Depot bauen.');const trailer=trailerId?TRAILERS.find(t=>t.id===trailerId):undefined;if(spec.attachment&&(!trailer||trailer.mount!==spec.attachment))throw Error('Einen passenden Auflieger / Aufbau auswählen.');if(!spec.attachment&&trailer)throw Error('Dieses Fahrzeug nimmt keinen Straßenauflieger auf.');if(wagonSets&&(spec.mode!=='rail'||!validWagons(wagonSets)))throw Error('Ungültiger Wagenverband.');const wagons=wagonSets?structuredClone(wagonSets):modelId==='bulkRail'?[{type:'bulk' as WagonId,count:8}]:modelId==='containerRail'?[{type:'container' as WagonId,count:10}]:modelId==='flatRail'?[{type:'flat' as WagonId,count:8}]:undefined;const wagonPrice=wagons?.reduce((sum,x)=>sum+x.count*WAGONS.find(w=>w.id===x.type)!.price,0)||0;debit(s,spec.price+(trailer?.price||0)+wagonPrice+(cooling?VAN_COOLING_PRICE:0),'Fahrzeugkäufe');
 const v:Vehicle={purchasedAt:Date.now(),statisticsSince:Date.now(),odometerKm:0,transportedEh:0,legRecordedKm:0,id:rid(),modelId,cooling,trailerId,wagons,homeDepotId:depot.id,locationId:depot.id,nextStop:0,status:'idle'};s.vehicles.push(v);log(s,`${spec.name} gekauft · ${euro(spec.price)}`,'good');return v;}
export function validWagons(sets:WagonSet[]){return Array.isArray(sets)&&sets.length>0&&new Set(sets.map(x=>x.type)).size===sets.length&&sets.every(x=>WAGONS.some(w=>w.id===x.type)&&Number.isInteger(x.count)&&x.count>=1&&x.count<=24)&&sets.reduce((n,x)=>n+x.count,0)<=24;}
export function purchaseFleet(s:State,request:{modelId:VehicleModelId;trailerId?:string;depotId:string;count:number;wagons?:WagonSet[];cooling?:boolean}){const model=VEHICLES.find(m=>m.id===request.modelId),trailer=TRAILERS.find(t=>t.id===request.trailerId);if(!model||!Number.isInteger(request.count)||request.count<1||request.count>MAX_FLEET_PURCHASE||s.vehicles.length+request.count>MAX_FLEET_VEHICLES)throw Error('1 bis '+MAX_FLEET_PURCHASE+' Fahrzeuge je Kauf; bis zu '+MAX_FLEET_VEHICLES+' Fahrzeuge je Spedition.');if(model.mode==='rail'&&!validWagons(request.wagons||[]))throw Error('Für einen Zug 1–24 passende Wagen zusammenstellen.');const per=model.price+(trailer?.price||0)+(request.cooling?VAN_COOLING_PRICE:0)+(request.wagons?.reduce((sum,x)=>sum+(WAGONS.find(w=>w.id===x.type)?.price||0)*x.count,0)||0);if(per*request.count>s.cash)throw Error('Nicht genügend Kapital für die gesamte Bestellung.');if(!s.sites.some(p=>p.id===request.depotId&&p.owned&&vehicleDepotCompatible(p.kind as BuildingKind,model)))throw Error('Ein passendes eigenes Depot auswählen.');const copy=structuredClone(s);const result=[];for(let n=0;n<request.count;n++)result.push(purchaseVehicle(copy,request.modelId,request.trailerId,request.depotId,request.wagons,!!request.cooling));Object.assign(s,copy);return result;}
export function wagonCapacity(v:Vehicle,freight:FreightType){const model=VEHICLES.find(x=>x.id===v.modelId)!;if(model.mode==='ship')return model.capacity;if(model.mode==='air')return freight==='hazardous'?0:model.capacity;if(model.mode==='van'){if(freight==='chilled')return v.cooling?Math.round(model.capacity*.9*100)/100:0;return model.types.includes(freight)?Math.round(model.capacity*(v.cooling?.9:1)*100)/100:0;}if(v.wagons){return v.wagons.reduce((sum,slot)=>{const wagon=WAGONS.find(x=>x.id===slot.type)!;return sum+((wagon.types as FreightType[]).includes(freight)?wagon.capacity*slot.count:0);},0);}
 const trailer=v.trailerId?TRAILERS.find(t=>t.id===v.trailerId):undefined;if(trailer)return trailer.types.includes(freight)?trailer.capacity:0;return model.types.includes(freight)?model.capacity:0;
}
export function cargoCapacity(vehicle:Vehicle,id:GoodId){const spec=VEHICLES.find(m=>m.id===vehicle.modelId),product=good(id),equipment=TRAILERS.find(t=>t.id===vehicle.trailerId);if(equipment?.heavyOnly&&!product?.requiresHeavy)return 0;if(product?.requiresHeavy&&['van','truck'].includes(spec?.mode||'')&&!equipment?.heavyOnly)return 0;const trailer=TRAILERS.find(t=>t.id===vehicle.trailerId);if(trailer?.goods&&!trailer.goods.includes(id))return 0;return wagonCapacity(vehicle,good(id).type);}
export function configureTrailer(s:State,id:string,trailerId:string){throw Error('Umrüsten ist deaktiviert. Die Ausstattung wird beim Kauf gewählt.');}
/** Idempotent migration: 1 EH = 100 kg; preserve mass and all money balances. */
export function normalizeFreightState(s:State){ensureFinance(s);
 if(s.quantityUnit!=='EH'){
  for(const goods of Object.values(s.inventory))for(const id of Object.keys(goods))goods[id]=(goods[id]||0)*10;
  for(const lots of Object.values(s.consignments||{}))for(const id of Object.keys(lots))lots[id]*=10;
  for(const c of s.contracts){c.daily*=10;c.delivered*=10;c.loadedToday*=10;c.deliveredToday*=10;c.fee/=10;if(c.total!==undefined)c.total*=10;}
  for(const l of s.lines)for(const st of l.stops)st.quantity*=10;
  for(const v of s.vehicles)if(v.cargo)v.cargo.quantity*=10;
  s.quantityUnit='EH';
 }
for(const c of s.contracts)if(c.kind==='haulage'&&!c.cancelled&&c.delivered<(c.total||0)&&c.endDay>=s.day&&c.deadlineRulesVersion!==15){const from=siteById(s,c.siteId),to=siteById(s,c.destinationId||'');if(from&&to){c.endDay=Math.max(c.endDay,c.startDay+containerTerms(distanceSites(from,to)).days);c.deadlineRulesVersion=15;}}
if(s.freightRulesVersion!==2){for(const v of s.vehicles)if(v.cargo&&cargoCapacity(v,v.cargo.good)<=0)v.cargo.legacyCapacity=v.cargo.quantity;s.freightRulesVersion=2;}
 for(const v of s.vehicles){if(v.handlingUntil&&v.handlingRulesVersion!==15){v.handlingUntil=Math.min(v.handlingUntil,s.day+handlingDays(v,vehicleCargo(v).reduce((n,c)=>n+c.quantity,0)||100));v.handlingRulesVersion=15;}ensureVehicleStatistics(v,s.day);const spec=VEHICLES.find(m=>m.id===v.modelId);if(spec?.attachment&&!v.trailerId)v.trailerId=spec.attachment==='body'?'body-cool':'krone-profi';}dailyEconomy(s);return s;}
export function configureTrain(s:State,vehicleId:string,sets:WagonSet[]){throw Error('Umrüsten ist deaktiviert. Den Zugverband beim Kauf konfigurieren.');}
function recoverableStock(s:State,siteId:string,id?:string){return Object.entries(s.inventory[siteId]||{}).some(([good,qty])=>(qty||0)>0&&(!id||good===id)&&s.contracts.some(c=>(c.kind==='process'||c.kind==='supply')&&c.siteId===siteId&&(c.good===good||!!RECIPES.find(r=>r.id===c.recipeId)?.inputs[good])));}
export function routePartners(s:State,goodId?:string){
 const ids=new Set(s.contracts.filter(c=>activeContract(s,c)).flatMap(c=>[c.siteId,...(c.destinationId?[c.destinationId]:[])]));
 return s.sites.filter(p=>!p.hidden&&(p.owned||p.cooperative||ids.has(p.id)||recoverableStock(s,p.id,goodId)||Object.entries(demandFor(p)).some(([id,n])=>n>0&&(!goodId||id===goodId))));
}
export function createLine(s:State,request:Omit<Line,'id'|'startDay'|'active'|'endDay'> & {duration:number|null}){
 if(!['van','truck','rail','ship','air'].includes(request.mode))throw Error('Ungültige Transportart.');if(!request.name.trim())throw Error('Liniennamen eingeben.');if(request.stops.length<2||request.stops.length>MAX_LINE_STOPS)throw Error('Eine Linie braucht 2 bis 200 Lade-/Entladestopps.');if(request.stops[0].action!=='load'||!request.stops.some(st=>st.action!=='load'))throw Error('Beginne mit Laden und lege mindestens einen Entladestopp fest.');
 if(!depotFor(s,request.mode))throw Error('Für diese Transportart fehlt ein Depot.');
 if(!Number.isFinite(request.duration as number)&&request.duration!==null||request.duration!==null&&(request.duration<1||request.duration>3650))throw Error('Ungültige Liniendauer.');
 if(request.good!=='all'&&!good(request.good))throw Error('Unbekanntes Gut.');validateLineSettings(request);
 const allowed=new Set(routePartners(s,request.good==='all'?undefined:request.good).map(p=>p.id));if(request.stops.some(st=>!allowed.has(st.siteId)))throw Error('Lieferanten benötigen einen Vertrag; Abnehmer müssen das gewählte Gut nachfragen.');
 const uniqueSites=new Set<string>();for(const stop of request.stops){if(!['load','unload','sell','transfer'].includes(stop.action))throw Error('Ungültige Stoppaktion.');validateContainerSelection(s,stop.orderIds);if(stop.good&&stop.good!=='all'&&!good(stop.good))throw Error('Ungültiger Güterfilter am Stopp.');if(!siteById(s,stop.siteId)||!Number.isFinite(stop.quantity)||stop.quantity<=0)throw Error('Ungültiger Stopp oder ungültige Menge.');uniqueSites.add(stop.siteId);}if(uniqueSites.size<2)throw Error('Die Linie braucht mindestens zwei verschiedene Standorte.');
 if(['rail','ship','air'].includes(request.mode)){
   const required=request.mode==='rail'?'railDepot':request.mode==='ship'?'port':'airport';
   const destinations=request.stops.map(stop=>siteById(s,stop.siteId)!);
   if(destinations.some(place=>!place.owned||!(required==='railDepot'?['railDepot','railStation'].includes(place.kind):required==='port'?['port','inlandPort'].includes(place.kind):place.kind===required)))throw Error(`${request.mode==='rail'?'Züge':request.mode==='ship'?'Schiffe':'Flugzeuge'} halten nur an gebauten ${required==='railDepot'?'Güterbahnhöfen':required==='port'?'Frachthäfen':'Frachtflughäfen'}. Verwende LKW für die Vor- und Nachläufe.`);
 }

 if(request.mode==='rail'){
   if(!s.tracks.length&&!(s.borrowedTracks?.length))throw Error('Gleisverkehr benötigt eigene oder freigegebene Gleise.');
   const stops=request.stops.map(x=>siteById(s,x.siteId)!);
   for(let i=0;i<stops.length;i++){
     const a=stops[i],b=stops[(i+1)%stops.length];
     if(!railRoute([...s.tracks,...(s.borrowedTracks||[])],[a.lat,a.lon],[b.lat,b.lon]))throw Error(`Keine befahrbare eigene Gleisverbindung: ${a.name} → ${b.name}. Bahnhof nahe ans Gleis setzen.`);
   }
 }
 const legs=request.stops.map((st,i)=>{const a=siteById(s,st.siteId)!,b=siteById(s,request.stops[(i+1)%request.stops.length].siteId)!;
 const rail=request.mode==='rail'?railRoute([...s.tracks,...(s.borrowedTracks||[])],[a.lat,a.lon],[b.lat,b.lon]):null;
 const provided=request.mode==='truck'||request.mode==='van'?request.legs?.find(x=>x.fromId===a.id&&x.toId===b.id):undefined;
 if(provided){if(provided.source!=='osm-strassen'||!Number.isFinite(provided.km)||provided.km+5<distanceSites(a,b)*.90||provided.path.length<2||provided.path.length>25000||provided.path.some(p=>p.length!==2||!p.every(Number.isFinite)))throw Error('Ungültige Straßenroute.');}
 return {geometryVersion:provided?.geometryVersion,fromId:a.id,toId:b.id,km:rail?.km??provided?.km??distanceSites(a,b),path:rail?.path??provided?.path??[[a.lat,a.lon],[b.lat,b.lon]],source:rail?'eigene-gleise':provided?'osm-strassen':request.mode==='air'?'luftlinie':'naeherung'} as RouteLeg;});
 const line:Line={manualDeparture:request.manualDeparture,inland:request.mode==='ship'&&request.stops.some(st=>siteById(s,st.siteId)?.kind==='inlandPort'),legs,id:rid(),name:request.name.slice(0,60),mode:request.mode,good:request.good,stops:request.stops,stopWhenDemandMet:!!request.stopWhenDemandMet,stopWhenSourcesEmpty:!!request.stopWhenSourcesEmpty,tripsPerDay:request.tripsPerDay||null,tripLimit:request.tripLimit||null,startDay:s.day,endDay:request.duration===null?null:s.day+request.duration,active:true};s.lines.push(line);log(s,`Linie „${line.name}“ eingerichtet (${request.duration===null?'unbefristet':request.duration+' Tage'})`,'good');return line;}
export const modeCompatible=(vehicle:Mode,line:Mode)=>vehicle===line||['van','truck'].includes(vehicle)&&['van','truck'].includes(line);
export const MAX_LINE_STOPS=200;
export function lineCargoCompatible(v:Vehicle,l:Line){const model=VEHICLES.find(m=>m.id===v.modelId);if(model?.mode==='ship'&&!model.inland&&l.inland)return false;return isManualLine(l)?GOODS.some(g=>cargoCapacity(v,g.id)>0):l.good==='all'?GOODS.some(g=>l.stops.some(st=>(st.good||'all')==='all'||st.good===g.id)&&cargoCapacity(v,g.id)>0):cargoCapacity(v,l.good)>0;}
export function validateLineSettings(p:{manualDeparture?:boolean;tripsPerDay?:number|null;tripLimit?:number|null;stopWhenDemandMet?:boolean;stopWhenSourcesEmpty?:boolean}){if(p.tripsPerDay!=null&&(!Number.isInteger(p.tripsPerDay)||p.tripsPerDay<1||p.tripsPerDay>1000))throw Error('1–1000 Fahrten pro Tag oder unbegrenzt wählen.');if(p.tripLimit!=null&&(!Number.isInteger(p.tripLimit)||p.tripLimit<1||p.tripLimit>10000))throw Error('Ungültige Fahrtenanzahl.');for(const key of ['manualDeparture','stopWhenDemandMet','stopWhenSourcesEmpty'] as const)if(p[key]!==undefined&&typeof p[key]!=='boolean')throw Error('Ungültige Linienoption.');}
export function updateLine(s:State,id:string,settings:Pick<Line,'manualDeparture'|'name'|'stopWhenDemandMet'|'stopWhenSourcesEmpty'|'tripsPerDay'|'tripLimit'> & {duration?:number|null}){const l=s.lines.find(l=>l.id===id&&!l.deleted&&l.active);if(!l)throw Error('Aktive Linie auswählen.');validateLineSettings(settings);if(!settings.name?.trim())throw Error('Liniennamen eingeben.');if(settings.duration!==undefined&&settings.duration!==null&&(!Number.isInteger(settings.duration)||settings.duration<1||settings.duration>3650))throw Error('Ungültige Gültigkeit.');if(settings.tripLimit!==l.tripLimit)l.completedVehicleIds=[];Object.assign(l,{manualDeparture:settings.manualDeparture??l.manualDeparture,name:settings.name.trim().slice(0,60),stopWhenDemandMet:!!settings.stopWhenDemandMet,stopWhenSourcesEmpty:!!settings.stopWhenSourcesEmpty,tripsPerDay:settings.tripsPerDay||null,tripLimit:settings.tripLimit||null});if(settings.duration!==undefined)l.endDay=settings.duration===null?null:s.day+settings.duration;for(const v of s.vehicles.filter(v=>v.lineId===id)){v.restUntil=undefined;v.restReason=undefined;}log(s,'Linieneinstellungen gespeichert: '+l.name,'good');}
export function updateLineStops(s:State,lineId:string,stops:Stop[],legs?:RouteLeg[],manualDeparture?:boolean){const line=s.lines.find(l=>l.id===lineId&&l.active&&!l.deleted);if(!line)throw Error('Aktive Linie auswählen.');const copy=structuredClone(s),validated=createLine(copy,{...line,manualDeparture:manualDeparture??line.manualDeparture,stops:structuredClone(stops),legs,duration:null});if(s.vehicles.some(v=>(v.lineId===lineId||v.pendingLineId===lineId)&&!lineCargoCompatible(v,validated)))throw Error('Die neuen Güterfilter passen nicht zu allen zugewiesenen Fahrzeugen.');for(const v of s.vehicles.filter(v=>v.lineId===lineId)){if(v.status==='enroute'){v.currentStop??=structuredClone(line.stops[v.nextStop]);v.restartAfterStop=true;}else{v.nextStop=0;v.dailyRestTargetId=undefined;v.dailyRestReturning=false;}v.restUntil=undefined;v.restReason=undefined;}line.manualDeparture=validated.manualDeparture;line.stops=validated.stops;line.legs=validated.legs;line.inland=validated.inland;log(s,'Stationen der Linie '+line.name+' aktualisiert.','good');}
export function renameVehicle(s:State,id:string,name:string){const v=s.vehicles.find(v=>v.id===id);name=name.trim();if(!v)throw Error('Fahrzeug nicht gefunden.');if(name.length<2||name.length>80)throw Error('Fahrzeugname: 2–80 Zeichen.');v.name=name;}
/** Current interpolated position on the active leg (same rule as the map). */
function legPoint(v:Vehicle,day:number):Coords|undefined{const path=v.currentLeg?.path;if(!path?.length||v.departDay===undefined||!v.etaDay)return;const t=Math.max(0,Math.min(1,(day-v.departDay)/Math.max(1e-12,v.etaDay-v.departDay)));let total=0;const lengths=path.slice(1).map((p,i)=>{const d=kmBetween(path[i],p);total+=d;return d;});let remaining=t*total;for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const f=lengths[i]?remaining/lengths[i]:0;return [path[i][0]+(path[i+1][0]-path[i][0])*f,path[i][1]+(path[i+1][1]-path[i][1])*f];}remaining-=lengths[i];}return path[path.length-1];}
/** Aircraft without a line (detaching or flying back to the hangar) take a new
 * line immediately: they turn in the air and fly directly to its first stop. */
function redirectAirborne(s:State,v:Vehicle,l:Line,spec:(typeof VEHICLES)[number]){const point=legPoint(v,s.day);if(!point)return false;let index=-1,best=Infinity;l.stops.forEach((st,i)=>{const p=siteById(s,st.siteId);if(!p)return;const d=kmBetween(point,[p.lat,p.lon]);if(d<best-1e-9){best=d;index=i;}});const stop=l.stops[index],target=siteById(s,stop?.siteId);if(!stop||!target)return false;recordVehicleDistance(v,s.day);v.servicePlan=undefined;v.detaching=false;v.waitingForCargo=false;v.manualHold=undefined;v.manualReleased=undefined;v.manualDepartureReady=false;v.pendingLineId=undefined;if(l.id===v.returnLineId)v.returnLineId=undefined;l.completedVehicleIds=l.completedVehicleIds?.filter(id=>id!==v.id);v.onReturnRoute=false;v.dailyRestTargetId=undefined;v.dailyRestReturning=false;v.restartAfterStop=undefined;v.lineId=l.id;v.nextStop=index;v.tripsToday=0;v.tripsTotal=0;v.cycleDelivered=0;v.restUntil=undefined;v.restReason=undefined;v.handlingUntil=undefined;v.waitingRoute=false;const km=kmBetween(point,[target.lat,target.lon]);v.currentStop=structuredClone(stop);v.targetId=target.id;v.currentLeg={fromId:v.locationId,toId:target.id,km,path:[point,[target.lat,target.lon]],source:'luftlinie'};v.legRecordedKm=0;v.departDay=s.day;v.etaDay=s.day+(s.live?vehicleTravelDays(v,km,v.currentLeg):Math.max(1,Math.ceil(km/(spec.speed*12))));v.status='enroute';log(s,`${v.name||spec.name} der Linie ${l.name} zugewiesen · fliegt direkt zum nächstgelegenen Stopp ${target.name}`,'good');return true;}
export function assignVehicle(s:State,vehicleId:string,lineId:string){const v=s.vehicles.find(v=>v.id===vehicleId),l=s.lines.find(l=>l.id===lineId&&!l.deleted),spec=VEHICLES.find(m=>m.id===v?.modelId);if(!v||!spec)throw Error('Fahrzeug nicht gefunden.');if(lineId&&(!l||!l.active||l.endDay!==null&&l.endDay<=s.day))throw Error('Linie ist nicht aktiv.');if(l&&(!modeCompatible(spec.mode,l.mode)||!lineCargoCompatible(v,l)))throw Error('Fahrzeug ist für diese Linie ungeeignet.');if(!lineId){v.servicePlan=undefined;v.manualHold=undefined;v.manualReleased=undefined;v.manualDepartureReady=false;v.pendingLineId=undefined;v.lineId=undefined;v.returnLineId=undefined;v.onReturnRoute=false;v.dailyRestTargetId=undefined;v.dailyRestReturning=false;v.waitingForCargo=false;v.restUntil=undefined;v.restReason=undefined;v.handlingUntil=undefined;v.restartAfterStop=undefined;if(v.status==='enroute'){v.detaching=true;v.restReason='Linie entfernt · beendet aktuelles Teilstück';}else if(v.status!=='returning'){v.detaching=false;startReturn(s,v);}log(s,'Fahrzeug von Linie entfernt; Rückfahrt ins Depot.','good');return;}if(v.status!=='idle'){if(l&&spec.mode==='air'&&(v.status==='returning'||v.detaching)&&redirectAirborne(s,v,l,spec))return;v.pendingLineId=lineId||null;if(v.detaching||v.status==='returning')v.restReason='Linienwechsel nach Ankunft eingeplant';log(s,'Linienwechsel nach Ankunft eingeplant.','good');return;}v.servicePlan=undefined;v.detaching=false;v.waitingForCargo=false;v.manualHold=undefined;v.manualReleased=undefined;v.manualDepartureReady=false;v.pendingLineId=undefined;if(l?.id===v.returnLineId)v.returnLineId=undefined;if(l)l.completedVehicleIds=l.completedVehicleIds?.filter(id=>id!==v.id);v.onReturnRoute=false;v.dailyRestTargetId=undefined;v.dailyRestReturning=false;v.currentStop=undefined;v.restartAfterStop=undefined;v.lineId=lineId||undefined;v.nextStop=0;v.tripsToday=0;v.tripsTotal=0;v.cycleDelivered=0;v.restUntil=undefined;v.restReason=undefined;if(!lineId)startReturn(s,v);log(s,l?`${v.name||spec.name} der Linie ${l.name} zugewiesen`:'Fahrzeug von Linie abgezogen','good');}
export function setReturnLine(s:State,vehicleId:string,lineId:string){const v=s.vehicles.find(v=>v.id===vehicleId),main=s.lines.find(l=>l.id===v?.lineId),back=s.lines.find(l=>l.id===lineId),model=VEHICLES.find(m=>m.id===v?.modelId);if(!v||!model)throw Error('Fahrzeug nicht gefunden.');if(v.onReturnRoute)throw Error('Laufende Retourroute zuerst beenden.');if(lineId&&(!main||!back||!back.active||back.deleted||back.id===main.id||back.endDay!==null&&back.endDay<=s.day||!modeCompatible(model.mode,back.mode)||!lineCargoCompatible(v,back)))throw Error('Eine andere aktive und geeignete Linie als Retourroute auswählen.');v.returnLineId=lineId||undefined;log(s,lineId?'Beladene Retourroute gespeichert.':'Retourroute entfernt.','good');}
export function assignFleet(s:State,vehicleIds:string[],lineId:string){if(!Array.isArray(vehicleIds)||!vehicleIds.length||vehicleIds.length>MAX_FLEET_VEHICLES||vehicleIds.some(id=>typeof id!=='string')||new Set(vehicleIds).size!==vehicleIds.length)throw Error('1–'+MAX_FLEET_VEHICLES+' unterschiedliche Fahrzeuge auswählen.');const copy=structuredClone(s);for(const id of vehicleIds)assignVehicle(copy,id,lineId);Object.assign(s,copy);}
export function cancelLine(s:State,lineId:string){const line=s.lines.find(l=>l.id===lineId);if(!line)return;line.active=false;line.deleted=true;line.endDay=s.day;log(s,`Linie ${line.name} gelöscht; Fahrzeuge beenden ihr laufendes Teilstück und fahren ins Depot.`);}
export function vehicleCargo(v:Vehicle):Cargo[]{return [v.cargo,...v.otherCargo||[]].filter((c):c is Cargo=>!!c&&c.quantity>0);}
function putCargo(v:Vehicle,cargo:Cargo[]){v.cargo=cargo[0];v.otherCargo=cargo.slice(1);}
export function availableToLoad(s:State,siteId:string,id:GoodId){const p=siteById(s,siteId);return !p||!canLoadFrom(s,p,id)?0:round2(id==='containers'?Math.min(stock(s,siteId,id),s.contracts.filter(c=>activeContainerOrder(s,c)).reduce((n,c)=>n+(s.consignments?.[siteId]?.[c.id]||0),0)):stock(s,siteId,id));}
/** Include cargo scheduled into a warehouse, even while its current stock is empty. */
export function potentialLoadGoods(s:State,siteId:string){
 const bySite=new Map<string,Set<string>>();const get=(id:string)=>{let set=bySite.get(id);if(!set){set=new Set();bySite.set(id,set);}return set;};
 for(const [id,items]of Object.entries(s.inventory))for(const [g,n]of Object.entries(items))if((n||0)>0)get(id).add(g);
 for(const t of s.terminalTransfers||[])get(t.toId).add(t.good);
 for(const c of s.contracts)if(activeContract(s,c)&&c.good&&(c.kind==='supply'||c.kind==='process'||c.kind==='haulage'))get(c.siteId).add(c.good);
 for(let pass=0;pass<=s.lines.length;pass++){let changed=false;for(const line of s.lines.filter(l=>l.active&&!l.deleted&&(l.endDay===null||l.endDay>s.day))){const carried=new Set<string>();for(const stop of line.stops){const filter=stop.good||line.good,accepts=(g:string)=>filter==='all'||filter===g;if(stop.action==='load'){if(filter!=='all'&&good(filter))carried.add(filter);for(const g of get(stop.siteId))if(accepts(g))carried.add(g);}else{const place=siteById(s,stop.siteId);if(!place?.owned&&!place?.cooperative)continue;for(const g of carried)if(accepts(g)&&!get(stop.siteId).has(g)){get(stop.siteId).add(g);changed=true;}}}}if(!changed)break;}
 return GOODS.filter(g=>get(siteId).has(g.id));
}
export function stopGoods(s:State,place:Site,action:Stop['action']){if(action==='load')return potentialLoadGoods(s,place.id);if(place.owned||place.cooperative)return GOODS;const ids=new Set([...Object.keys(demandFor(place)),...s.contracts.filter(c=>activeContract(s,c)&&c.kind==='process'&&c.siteId===place.id).flatMap(c=>Object.keys(RECIPES.find(r=>r.id===c.recipeId)?.inputs||{})),...(s.contracts.some(c=>activeContract(s,c)&&c.kind==='haulage'&&c.destinationId===place.id)?['containers']:[])]);return GOODS.filter(g=>ids.has(g.id));}
export function lineDailyEconomy(s:State,line:Pick<Line,'stops'|'good'>,market?:DailyMarket){const seenDemand=new Set<string>(),seenResources=new Set<string>(),book=market||s.localMarket||newMarket(s.day),sites=new Map(s.sites.map(p=>[p.id,p])),contracts=new Map<string,Contract[]>();for(const c of s.contracts)if(activeContract(s,c)){const rows=contracts.get(c.siteId)||[];rows.push(c);contracts.set(c.siteId,rows);}let demandDaily=0,demandRemaining=0,resourceDaily=0,resourcesReserved=0,ready=0;const stops=line.stops.map((stop,index)=>{const place=sites.get(stop.siteId),filter=stop.good||line.good,accepts=(id:string)=>filter==='all'||filter===id;const demands=place&&stop.action!=='load'?Object.entries(demandFor(place)).filter(([id])=>accepts(id)).map(([good,daily])=>({good,daily,remaining:remainingDemand(book,place.id,good,daily,s.day)})):[];for(const row of demands){const key=place!.id+'/'+row.good;if(!seenDemand.has(key)){seenDemand.add(key);demandDaily+=row.daily;demandRemaining+=row.remaining;}}
 const production=place&&stop.action==='load'?profile(place).production:{},rights=contracts.get(stop.siteId)||[],ids=new Set([...Object.keys(production),...Object.keys(s.inventory[stop.siteId]||{}),...rights.flatMap(c=>c.good?[c.good]:[])]);const resources=place&&stop.action==='load'?[...ids].filter(id=>accepts(id)&&!!good(id)).map(id=>{const matching=rights.filter(c=>c.good===id),reserved=matching.filter(c=>c.kind==='supply').reduce((n,c)=>n+c.daily,0),processed=matching.filter(c=>c.kind==='process').reduce((n,c)=>n+c.daily*(RECIPES.find(r=>r.id===c.recipeId)?.yield||0),0);return {good:id,daily:reserved+processed,reserved,ready:availableToLoad(s,place.id,id)};}).filter(r=>r.daily>0||r.ready>0):[];for(const row of resources){const key=place!.id+'/'+row.good;if(!seenResources.has(key)){seenResources.add(key);resourceDaily+=row.daily;resourcesReserved+=row.reserved;ready+=row.ready;}}return {index,siteId:stop.siteId,demands,resources,demandDaily:demands.reduce((n,r)=>n+r.daily,0),demandRemaining:demands.reduce((n,r)=>n+r.remaining,0),resourceDaily:resources.reduce((n,r)=>n+r.daily,0),ready:resources.reduce((n,r)=>n+r.ready,0)};});return {stops,demandDaily,demandRemaining,resourceDaily,resourcesReserved,ready};}
/** Test actual stock, free payload space and shared remaining demand before travelling. */
export function stopHasWork(s:State,v:Vehicle,line:Line,index:number,market?:DailyMarket){const st=line.stops[index],place=st&&siteById(s,st.siteId);if(!st||!place||place.hidden)return false;const filter=st.good||line.good,accepts=(g:string)=>filter==='all'||filter===g,cargo=vehicleCargo(v),used=cargo.reduce((n,c)=>n+c.quantity/Math.max(cargoCapacity(v,c.good),c.legacyCapacity||0,1),0);
 if(st.action==='load')return used<.9999&&GOODS.some(g=>serviceQuantity(s,v,line,index,g.id)>.001&&accepts(g.id)&&cargoCapacity(v,g.id)>0&&availableToLoad(s,place.id,g.id)>.001&&(g.id==='containers'?loadingContainerOrders(s,v,line,st,place.id).some(r=>receivingCapacity(s,v,line,st,g.id,market,r.order.id)>.001):receivingCapacity(s,v,line,st,g.id,market)>.001));
 return cargo.some(c=>{if(serviceQuantity(s,v,line,index,c.good)<=.001||!accepts(c.good)||!isManualLine(line)&&c.good==='containers'&&c.orderId&&!containerStopAllows(st,{...v,containerOrderIds:undefined},c.orderId))return false;if(c.orderId&&s.contracts.some(o=>o.id===c.orderId&&activeContract(s,o)&&o.destinationId===place.id))return true;if(place.owned||place.cooperative)return storageCapacity(place)-stockTotal(s,place.id)>.001;const demand=demandFor(place)[c.good]||0;if(demand)return remainingDemand(market||s.localMarket||newMarket(s.day),place.id,c.good,demand,s.day)>.001;return s.contracts.some(o=>activeContract(s,o)&&o.kind==='process'&&o.siteId===place.id&&!!RECIPES.find(r=>r.id===o.recipeId)?.inputs[c.good])&&storageCapacity(place)-stockTotal(s,place.id)>.001;});
}
export function shortcutStop(s:State,v:Vehicle,line:Line,completedIndex:number,market?:DailyMarket){const next=completedIndex+1,cargo=vehicleCargo(v);if(next>=line.stops.length)return 0;
 if(line.stopWhenDemandMet&&line.stops[completedIndex]?.action!=='load'&&!cargo.length)return 0;
 if(line.stopWhenDemandMet||line.stopWhenSourcesEmpty){for(let i=next;i<line.stops.length;i++)if(stopHasWork(s,v,line,i,market))return i;return 0;}
 if(line.stops[completedIndex]?.action==='load'&&cargo.length){const used=cargo.reduce((n,c)=>n+c.quantity/Math.max(cargoCapacity(v,c.good),c.legacyCapacity||0,1),0);if(used>=.9999){const destination=line.stops.findIndex((st,i)=>i>completedIndex&&st.action!=='load'&&cargo.some(c=>(st.good||line.good)==='all'||(st.good||line.good)===c.good));if(destination>=next)return destination;}}
 return next;
}
export function handlingDays(v:Vehicle,quantity:number){const mode=VEHICLES.find(m=>m.id===v.modelId)?.mode;return quantity<=0?0:((mode==='ship'?90:mode==='rail'?45:mode==='air'?30:15)+quantity*(mode==='ship'?.012:mode==='rail'?.04:mode==='air'?.15:.25))/86400;}
export const euro=(n:number)=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const round2=(n:number)=>Math.round(n*100)/100;
function activeContract(s:State,c:Contract){return !c.cancelled&&c.startDay<=s.day&&c.endDay>=s.day&&(c.kind!=='haulage'||c.delivered<(c.total||0));}
function canLoadFrom(s:State,place:Site,product:GoodId){if(place.hidden)return false;if(place.owned||place.cooperative||recoverableStock(s,place.id,product))return true;return s.contracts.some(c=>activeContract(s,c)&&c.siteId===place.id&&(c.kind==='supply'&&c.good===product||c.kind==='process'&&c.good===product||c.kind==='haulage'&&product==='containers'));}
const capacityAt=storageCapacity;
function stockTotal(s:State,siteId:string){return terminalReserved(s,siteId)+Object.values(s.inventory[siteId]||{}).reduce<number>((a,b)=>a+(b||0),0);}
function loadStop(s:State,v:Vehicle,line:Line,stop:Stop,place:Site,requestedOrderId?:string,market?:DailyMarket){if(v.cargo&&v.cargo.quantity>0){log(s,`${line.name}: ${v.id} hat noch Fracht an Bord.`,'warn');return;}
 if(!canLoadFrom(s,place,line.good)){log(s,`Laden bei ${place.name}: kein gültiger Liefer-/Verarbeitungsvertrag.`,'warn');return;}
 let qty=Math.min(serviceQuantity(s,v,line,v.nextStop,line.good),stock(s,place.id,line.good),stop.quantity,cargoCapacity(v,line.good),receivingCapacity(s,v,line,stop,line.good,market,requestedOrderId));let orderId:string|undefined;
 if(!place.owned&&profile(place).production[line.good]&&line.good!=='containers'){
   const rights=s.contracts.filter(c=>activeContract(s,c)&&c.kind==='supply'&&c.siteId===place.id&&c.good===line.good);
   const left=rights.reduce((n,c)=>n+Math.max(0,c.daily-c.loadedToday),0);
   let remaining=qty;for(const c of rights){const used=Math.min(remaining,c.daily-c.loadedToday);if(used>0){c.loadedToday+=used;remaining-=used;}}
 }
 if(line.good==='containers'){
   const order=loadingContainerOrders(s,v,line,stop,place.id).find(r=>!requestedOrderId||r.order.id===requestedOrderId)?.order;
   qty=Math.min(qty,order?lot(s,place.id,order.id):0);
   if(order){orderId=order.id;setLot(s,place.id,order.id,lot(s,place.id,order.id)-qty);if(order.siteId===place.id)order.loadedToday=round2(order.loadedToday+qty);}
 }
 qty=round2(qty);if(qty<=0){log(s,`${place.name}: ${good(line.good).name} noch nicht verladebereit.`,'warn');return;}
 consumeService(v,v.nextStop,line.good,qty);setStock(s,place.id,line.good,stock(s,place.id,line.good)-qty);v.cargo={good:line.good,quantity:qty,orderId,loadedAtId:place.id};log(s,`${line.name}: ${qty} EH ${good(line.good).name} bei ${place.name} geladen.`,'good');}
function unloadStop(s:State,v:Vehicle,line:Line,stop:Stop,place:Site,market?:DailyMarket){if(!v.cargo||v.cargo.good!==line.good||v.cargo.quantity<=0)return;
 if(place.hidden)return;if(line.good==='containers'&&!place.owned&&!place.cooperative&&!s.contracts.some(c=>c.kind==='haulage'&&activeContract(s,c)&&c.id===v.cargo?.orderId&&c.destinationId===place.id))return;let qty=Math.min(v.cargo.quantity,stop.quantity,serviceQuantity(s,v,line,v.nextStop,line.good));
 if(line.good==='containers'&&s.contracts.some(c=>c.kind==='haulage'&&activeContract(s,c)&&c.id===v.cargo?.orderId&&c.destinationId===place.id)){
   const order=s.contracts.find(c=>c.kind==='haulage'&&activeContract(s,c)&&c.id===v.cargo?.orderId&&c.destinationId===place.id)!;
   qty=Math.min(qty,(order.total||0)-order.delivered);if(qty<=0)return;order.delivered=round2(order.delivered+qty);const payment=round2(qty*order.fee);credit(s,payment,'Transportvergütung');order.paid=round2(order.paid+payment);if(order.delivered>=(order.total||Infinity)-.000001){order.completedDay=s.day;log(s,'Containerauftrag abgeschlossen · '+euro(order.paid)+' insgesamt gutgeschrieben.','good');}log(s,`Containerlieferung: ${qty} EH an ${place.name} · +${euro(payment)}`,'good');
 }else if(!place.owned&&!place.cooperative&&line.good!=='containers'&&(demandFor(place)[line.good]||0)>0&&(stop.action==='sell'||!s.contracts.some(c=>c.kind==='process'&&activeContract(s,c)&&c.siteId===place.id&&!!RECIPES.find(r=>r.id===c.recipeId)?.inputs[line.good]))){
  const book=market||(s.localMarket??=newMarket(s.day));qty=consumeDemand(book,place.id,line.good,demandFor(place)[line.good],qty,s.day);
  if(qty<=0){log(s,place.name+': Tagesbedarf bereits von einer Spedition erfüllt.','warn');return;}
  const payment=round2(qty*good(line.good).sale);credit(s,payment,'Warenverkauf');const legacy=s.contracts.find(c=>c.kind==='sale'&&c.siteId===place.id&&c.good===line.good);if(legacy){legacy.delivered+=qty;legacy.deliveredToday+=qty;legacy.paid+=payment;}
  log(s,`${qty} EH ${good(line.good).name} an ${place.name} verkauft · +${euro(payment)}`,'good');
 }else if(place.owned||place.cooperative||profile(place).recipes.length>0||place.kind==='warehouse'){
  if(!place.owned&&place.kind!=='warehouse'&&!s.contracts.some(c=>activeContract(s,c)&&c.kind==='process'&&c.siteId===place.id)){
    log(s,`Anlieferung an ${place.name}: Verarbeitungsvertrag fehlt.`,'warn');return;
  }
  qty=Math.max(0,Math.min(qty,capacityAt(place)-stockTotal(s,place.id)));qty=round2(qty);if(qty>0){setStock(s,place.id,line.good,stock(s,place.id,line.good)+qty);if(line.good==='containers'&&v.cargo?.orderId)setLot(s,place.id,v.cargo.orderId,lot(s,place.id,v.cargo.orderId)+qty);}
 }else if(line.good==='containers'){
   log(s,`${place.name}: kein passender Containerauftrag.`,'warn');return;
 }else{
  log(s,place.name+': Dieses Gut wird nicht nachgefragt.','warn');return;
 }
 if(qty>0){consumeService(v,v.nextStop,line.good,qty);recordTransportedEh(v,qty,v.cargo.loadedAtId,place.id);v.cycleDelivered=(v.cycleDelivered||0)+qty;v.cargo.quantity=round2(v.cargo.quantity-qty);if(v.cargo.quantity<.01)v.cargo=undefined;}
}
function operateStop(s:State,v:Vehicle,line:Line,stop:Stop,place:Site,market?:DailyMarket){const filter=stop.good||line.good;let cargo=vehicleCargo(v);if(stop.action==='load'){
 const candidates=filter==='all'?GOODS.filter(g=>availableToLoad(s,place.id,g.id)>0):GOODS.filter(g=>g.id===filter);
 for(const g of candidates){if(v.manualGoods&&v.manualGoods!=='all'&&!v.manualGoods.includes(g.id))continue;const orders=g.id==='containers'?loadingContainerOrders(s,v,line,stop,place.id).map(r=>r.order.id):[undefined];let loaded=0;for(const orderId of orders){const cap=cargoCapacity(v,g.id);if(cap<=0)continue;const used=cargo.reduce((n,c)=>n+c.quantity/Math.max(cargoCapacity(v,c.good),c.legacyCapacity||0,1),0),free=Math.floor(Math.max(0,1-used)*cap*100)/100;if(free<.01||loaded>=stop.quantity)break;v.cargo=undefined;v.otherCargo=cargo;loadStop(s,v,{...line,good:g.id},{...stop,quantity:Math.min(stop.quantity-loaded,free)},place,orderId,market);const loadedCargo=v.cargo as Cargo|undefined;if(loadedCargo){loaded+=loadedCargo.quantity;cargo.push(loadedCargo);}v.cargo=undefined;}}
 }else{const kept:Cargo[]=[];for(const c of cargo){if(filter!=='all'&&c.good!==filter||!isManualLine(line)&&c.good==='containers'&&c.orderId&&!containerStopAllows(stop,{...v,containerOrderIds:undefined},c.orderId)){kept.push(c);continue;}v.cargo=c;unloadStop(s,v,{...line,good:c.good},stop,place,market);if(v.cargo)kept.push(v.cargo);}cargo=kept;}putCargo(v,cargo);}
function holdForManualDeparture(v:Vehicle,line:Line,index:number){v.status='idle';v.manualHold={lineId:line.id,siteId:v.locationId,index};v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;v.currentLeg=undefined;v.currentStop=undefined;v.restUntil=undefined;v.restReason='Wartet auf Go';v.nextStop=index;}
export function requestManualDeparture(s:State,id:string,goods:GoodId[]|'all',orderIds?:string[],sourceIds?:string[]){const v=s.vehicles.find(v=>v.id===id),line=s.lines.find(l=>l.id===(v?.onReturnRoute?v.returnLineId:v?.lineId)&&l.active&&!l.deleted&&(l.endDay===null||l.endDay>s.day));if(!v||!line||!v.manualHold||v.status!=='idle'||v.manualHold.lineId!==line.id||v.manualHold.siteId!==v.locationId||!isManualLine(line)||line.stops[v.manualHold.index]?.siteId!==v.locationId)throw Error('Dieses Fahrzeug wartet nicht an einem manuellen Ladestopp.');if(goods!=='all'&&(!Array.isArray(goods)||goods.some(id=>!GOODS.some(g=>g.id===id))||new Set(goods).size!==goods.length))throw Error('Gültige Güterauswahl erforderlich.');validateContainerSelection(s,orderIds);v.containerOrderIds=[...(orderIds??line.stops[v.manualHold.index].orderIds??[])];const stop=line.stops[v.manualHold.index],readyAfterDay=stop.action==='load'?stageManualFreight(s,v,line,stop,goods,sourceIds):s.day;v.manualReleased={...v.manualHold,readyAfterDay,goods:structuredClone(goods)};v.manualHold=undefined;v.restReason='Go bestätigt';v.restUntil=undefined;v.dailyRestTargetId=undefined;v.dailyRestReturning=false;}
export function setVehicleContainerOrders(s:State,vehicleId:string,ids:string[]|undefined){const v=s.vehicles.find(v=>v.id===vehicleId);if(!v)throw Error('Eigenes Fahrzeug auswählen.');validateContainerSelection(s,ids);v.containerOrderIds=ids===undefined?undefined:[...ids];v.restUntil=undefined;v.restReason=undefined;log(s,'Container-Ladeauswahl gespeichert.','good');}
function restReason(s:State,v:Vehicle,l:Line,market?:DailyMarket){if(l.tripsPerDay&&(v.tripsToday||0)>=l.tripsPerDay)return 'Tägliche Fahrten erfüllt';const loads=l.stops.filter(st=>st.action==='load');if(l.stopWhenSourcesEmpty&&!vehicleCargo(v).length&&loads.length&&loads.every(st=>{const p=siteById(s,st.siteId);const f=st.good||l.good;return !p||!GOODS.some(g=>(f==='all'||f===g.id)&&cargoCapacity(v,g.id)>0&&availableToLoad(s,p.id,g.id)>0);} ))return 'Produzenten / Ladeorte heute leer';if(l.stopWhenDemandMet){let daily=0,remaining=0;const book=market||s.localMarket||newMarket(s.day);for(const stop of l.stops){if(stop.action==='load')continue;const place=siteById(s,stop.siteId);if(!place||place.owned||place.cooperative)continue;const filter=stop.good||l.good;for(const [id,n]of Object.entries(demandFor(place)))if(filter==='all'||id===filter){daily+=n;remaining+=remainingDemand(book,place.id,id,n,s.day);}}if(daily>0&&remaining<=.000001)return 'Tagesbedarf aller Endkunden erfüllt';}return '';}
function travelDays(a:Site,b:Site,mode:Mode,speed:number,live=false){const factor=mode==='truck'||mode==='van'?1.28:mode==='rail'?1.15:1;const hours=mode==='ship'?19:mode==='rail'?18:mode==='air'?12:13;return live?Math.max(10/86400,distanceSites(a,b)*factor/(speed*24)):Math.max(1,Math.ceil(distanceSites(a,b)*factor/(speed*hours)));}
function dispatch(s:State,v:Vehicle,line:Line){const stop=line.stops[v.nextStop];if(!stop){v.nextStop=0;return;}const origin=siteById(s,v.locationId),target=siteById(s,stop.siteId),spec=VEHICLES.find(x=>x.id===v.modelId)!;if(!target||!origin){v.lineId=undefined;v.status='idle';return;}v.targetId=target.id;v.currentStop=structuredClone(stop);const leg=origin.id===target.id?{fromId:origin.id,toId:target.id,km:0,path:[[origin.lat,origin.lon],[target.lat,target.lon]] as Coords[],source:'osm-strassen' as const}:line.legs?.find(x=>x.fromId===origin.id&&x.toId===target.id)||s.roadRoutes?.find(x=>x.fromId===origin.id&&x.toId===target.id);if(s.live&&['truck','van'].includes(line.mode)&&(!leg||leg.source!=='osm-strassen')){const road=s.roadRoutes?.find(r=>r.fromId===origin.id&&r.toId===target.id);if(!road){v.waitingRoute=true;v.restReason='Straßenroute wird vorbereitet';return;}v.currentLeg=road;}else v.currentLeg=leg;v.waitingRoute=false;const km=v.currentLeg?.km??distanceSites(origin,target);v.currentLeg??={fromId:origin.id,toId:target.id,km,path:[[origin.lat,origin.lon],[target.lat,target.lon]],source:line.mode==='air'?'luftlinie':'naeherung'};const factor=leg?.source==='naeherung'&&['truck','van'].includes(line.mode)?1.28:1;const hours=line.mode==='ship'?19:line.mode==='rail'?18:line.mode==='air'?12:13;v.legRecordedKm=0;v.departDay=s.day;v.etaDay=s.day+(s.live?vehicleTravelDays(v,km*factor,v.currentLeg):Math.max(1,Math.ceil(km*factor/(spec.speed*hours))));v.status='enroute';}
function depotUnload(s:State,v:Vehicle){const cargo=vehicleCargo(v),keep:Cargo[]=[];const dest=siteById(s,v.locationId);if(!dest||!dest.owned&&!dest.cooperative)return;for(const c of cargo){const qty=round2(Math.max(0,Math.min(capacityAt(dest)-stockTotal(s,dest.id),c.quantity)));if(qty){recordTransportedEh(v,qty,c.loadedAtId,dest.id);setStock(s,dest.id,c.good,stock(s,dest.id,c.good)+qty);if(c.orderId)setLot(s,dest.id,c.orderId,lot(s,dest.id,c.orderId)+qty);c.quantity=round2(c.quantity-qty);}if(c.quantity>0)keep.push(c);}putCargo(v,keep);}
function startReturn(s:State,v:Vehicle){v.manualHold=undefined;v.manualReleased=undefined;v.manualDepartureReady=false;v.manualGoods=undefined;const model=VEHICLES.find(x=>x.id===v.modelId)!,location=siteById(s,v.locationId),depot=s.sites.find(p=>p.id===v.homeDepotId&&p.owned)||depotFor(s,model.mode,location);v.lineId=undefined;v.nextStop=0;v.restUntil=undefined;if(!depot||!location){v.status='idle';v.targetId=undefined;v.etaDay=undefined;return;}if(location.id===depot.id){v.status='idle';v.etaDay=undefined;v.targetId=undefined;depotUnload(s,v);return;}const leg=s.roadRoutes?.find(r=>r.fromId===location.id&&r.toId===depot.id);if(['truck','van'].includes(model.mode)&&!leg){v.status='idle';v.waitingRoute=true;v.targetId=depot.id;v.restReason='Depot-Straßenroute wird vorbereitet';return;}const rail=model.mode==='rail'?railRoute([...s.tracks,...s.borrowedTracks||[]],[location.lat,location.lon],[depot.lat,depot.lon]):null;if(model.mode==='rail'&&!rail){v.waitingRoute=true;v.targetId=depot.id;v.restReason='Keine Gleisverbindung zum Depot';return;}v.currentLeg=leg||{fromId:location.id,toId:depot.id,km:rail?.km||distanceSites(location,depot),path:rail?.path||[[location.lat,location.lon],[depot.lat,depot.lon]],source:rail?'eigene-gleise':model.mode==='air'?'luftlinie':'naeherung'};v.status='returning';v.waitingRoute=false;v.targetId=depot.id;v.legRecordedKm=0;v.departDay=s.day;v.etaDay=s.day+(s.live?vehicleTravelDays(v,v.currentLeg.km,v.currentLeg):travelDays(location,depot,model.mode,effectiveVehicleSpeed(v)));}
export function dailyRestDestination(s:State,v:Vehicle,line:Line){const i=firstPotentialLoadStop(s,v,line);return siteById(s,line.stops[i>=0?i:0]?.siteId);}
function returnForDailyRest(s:State,v:Vehicle,line:Line){const target=siteById(s,v.dailyRestTargetId||'');if(!target)return;if(v.locationId===target.id){v.dailyRestTargetId=undefined;v.dailyRestReturning=false;v.nextStop=Math.max(0,line.stops.findIndex(st=>st.siteId===target.id&&st.action==='load'));return;}v.nextStop=0;dispatch(s,v,{...line,stops:[{siteId:target.id,action:'transfer',good:'all',quantity:1e9}]});v.dailyRestReturning=v.status==='enroute';}
function waitAtLoadPoint(s:State,v:Vehicle,line:Line,reason:string){v.restReason=reason;v.waitingForCargo=true;v.dailyRestTargetId=dailyRestDestination(s,v,line)?.id;returnForDailyRest(s,v,line);}
function advanceEconomy(previous:State,dt=1,market?:DailyMarket):State {if(!Number.isFinite(dt)||dt<0)throw Error('Weltzeit darf nicht zurücklaufen.');const s:State=structuredClone(previous);dailyEconomy(s);for(const v of s.vehicles)ensureVehicleStatistics(v,s.day);s.day+=dt;
 // Old refinery supply reservations no longer create oil or incur future fees.
 for(const c of s.contracts)if(!c.cancelled&&c.kind==='supply'&&c.good==='crudeOil'&&siteById(s,c.siteId)?.kind==='refinery'){c.cancelled=true;c.endDay=s.day;log(s,'Rohöl-Abnahmevertrag beendet: Raffinerien verarbeiten angeliefertes Rohöl.','info');}
 if(Math.floor(s.day)>Math.floor(previous.day))for(const c of s.contracts){c.deliveredToday=0;if(c.kind!=='haulage')c.loadedToday=0;c.processedToday=0;}
 const ledger=dailyEconomy(s);finishTerminalTransfers(s);
 // Reservations are payable once per calendar game day, even without pickup.
 // Legacy saves credit the EH already bought today and never bill past days.
 for(const c of s.contracts){if(c.kind!=='supply'||!activeContract(s,c)||s.day>=c.endDay)continue;const day=Math.floor(s.day);let charge=0;if(c.reservationBillingDay===undefined)charge=Math.max(0,c.daily-c.loadedToday)*c.fee;else if(c.reservationBillingDay<day)charge=(day-c.reservationBillingDay)*c.daily*c.fee;if(charge>0){charge=round2(charge);recordFinance(s,charge,false,'Warenreservierungen');s.cash-=charge;s.spent+=charge;c.paid=round2(c.paid+charge);}c.reservationBillingDay=Math.max(c.reservationBillingDay??day,day);}
 // Daily source output is available as one batch at the beginning of the day.
 for(const c of s.contracts){if(!activeContract(s,c)||s.day>=c.endDay||c.kind!=='supply'||!c.good)continue;const site=siteById(s,c.siteId);if(!site||!profile(site).production[c.good])continue;const day=Math.floor(s.day);if(c.productionDay===undefined){c.productionDay=day;}else if(c.productionDay<day){const days=day-c.productionDay,existing=stock(s,c.siteId,c.good),reserved=s.contracts.filter(x=>x.kind==='supply'&&x.siteId===c.siteId&&x.good===c.good&&activeContract(s,x)&&s.day<x.endDay).reduce((n,x)=>n+x.daily,0);setStock(s,c.siteId,c.good,Math.max(existing,Math.min(reserved*3,existing+c.daily*days)));const row=ledger.sources[c.siteId]??={};row[c.good]=(row[c.good]||0)+c.daily;c.productionDay=day;}}
 // Processing contracts share one factory's fixed total input capacity.
 const pendingProcessing=s.contracts.filter(c=>c.kind==='process');for(let pass=0;pass<Math.min(64,pendingProcessing.length+1);pass++){let produced=false;for(const c of pendingProcessing){if(!activeContract(s,c)||c.kind!=='process'||!c.recipeId)continue;const recipe=RECIPES.find(r=>r.id===c.recipeId),site=siteById(s,c.siteId);if(!recipe||!site||!profile(site).recipes.includes(c.recipeId))continue;let possible=Math.max(0,Math.min(c.daily-(c.processedToday||0),profile(site).capacity-(ledger.processing[site.id]||0)));for(const [id,input] of Object.entries(recipe.inputs))possible=Math.min(possible,stock(s,site.id,id as GoodId)/(input||1));const free=capacityAt(site)-stockTotal(s,site.id);possible=Math.min(possible,(recipe.yield-Object.values(recipe.inputs).reduce<number>((n,q)=>n+(q||0),0)>0?free/(recipe.yield-Object.values(recipe.inputs).reduce<number>((n,q)=>n+(q||0),0)):Infinity));possible=Math.floor(Math.min(possible,s.cash/recipe.fee)*1000000)/1000000;if(possible<=.000001)continue;for(const [id,input]of Object.entries(recipe.inputs))setStock(s,site.id,id as GoodId,stock(s,site.id,id as GoodId)-possible*(input||0));setStock(s,site.id,recipe.output,stock(s,site.id,recipe.output)+possible*recipe.yield);const fee=possible*recipe.fee;debit(s,fee,'Verarbeitung');c.paid+=fee;c.processedToday=(c.processedToday||0)+possible;ledger.processing[site.id]=(ledger.processing[site.id]||0)+possible;produced=true;}if(!produced)break;}
 for(const v of s.vehicles){recordVehicleDistance(v,s.day);const spec=VEHICLES.find(x=>x.id===v.modelId)!;if(v.status!=='idle'||v.lineId&&!v.restUntil){if(s.cash>=spec.cost*dt)debit(s,spec.cost*dt,'Betriebskosten');else{log(s,`${spec.name} pausiert: laufende Betriebskosten nicht gedeckt.`,'warn');continue;}}
 if(v.scheduleDay!==Math.floor(s.day)){v.scheduleDay=Math.floor(s.day);v.tripsToday=0;if(!v.dailyRestTargetId&&!v.dailyRestReturning){v.restUntil=undefined;v.restReason=undefined;}}
 if(v.pendingLineId===null)assignVehicle(s,v.id,'');
 if(v.detaching){if(v.status==='enroute'&&(v.etaDay||0)>s.day)continue;v.locationId=v.targetId||v.locationId;v.status='idle';v.currentLeg=undefined;v.currentStop=undefined;v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;v.detaching=false;v.restReason=undefined;const pending=v.pendingLineId;v.pendingLineId=undefined;if(pending)assignVehicle(s,v.id,pending);else startReturn(s,v);continue;}
 if(v.waitingRoute&&!v.lineId){startReturn(s,v);continue;}
 if(v.status==='returning'){if((v.etaDay||0)<=s.day){v.locationId=v.targetId||v.locationId;v.status='idle';if(!v.waitingRoute)v.restReason=undefined;v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;depotUnload(s,v);log(s,`${spec.name} im Depot eingetroffen.`,'good');}continue;}
 if(v.handlingUntil&&v.handlingUntil>s.day)continue;if(v.handlingUntil){v.handlingUntil=undefined;v.restReason=undefined;}
 if(v.status==='idle'&&v.pendingLineId!==undefined){const next=v.pendingLineId;v.pendingLineId=undefined;assignVehicle(s,v.id,next||'');continue;}
 const mainLine=s.lines.find(l=>l.id===v.lineId),returnLine=s.lines.find(l=>l.id===v.returnLineId),line=v.onReturnRoute?returnLine:mainLine;if(!line){if(v.lineId)startReturn(s,v);continue;}
 ensureServicePlan(s,v,line,market);
 if(v.status==='enroute'&&(v.etaDay||0)<=s.day){const stop=v.currentStop||line.stops[v.nextStop],site=siteById(s,v.targetId||stop?.siteId);if(v.dailyRestReturning){v.locationId=site?.id||v.locationId;v.status='idle';v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;v.currentLeg=undefined;v.currentStop=undefined;v.restartAfterStop=undefined;returnForDailyRest(s,v,line);continue;}if(site&&isManualLine(line)&&line.stops[v.nextStop]?.siteId===site.id){v.locationId=site.id;holdForManualDeparture(v,line,v.nextStop);continue;}if(site){v.locationId=site.id;const before=vehicleCargo(v).reduce((n,c)=>n+c.quantity,0);operateStop(s,v,line,stop,site,market);const handled=Math.abs(before-vehicleCargo(v).reduce((n,c)=>n+c.quantity,0));if(s.live&&handled>.001){v.handlingUntil=s.day+handlingDays(v,handled);v.handlingRulesVersion=15;v.restReason=stop.action==='load'?'Beladen':'Entladen';}}const restarting=v.restartAfterStop,completedIndex=v.nextStop;v.nextStop=restarting?0:shortcutStop(s,v,line,v.nextStop,market);v.restartAfterStop=undefined;const cycleCompleted=v.nextStop===0&&!restarting&&(completedIndex===line.stops.length-1||!returnLine);if(cycleCompleted&&returnLine?.active&&!returnLine.deleted&&(returnLine.endDay===null||returnLine.endDay>s.day)&&mainLine?.active&&!mainLine.deleted){v.onReturnRoute=!v.onReturnRoute;if(v.onReturnRoute){v.status='idle';v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;v.currentLeg=undefined;v.currentStop=undefined;continue;}}if(cycleCompleted&&(v.cycleDelivered||0)>.000001){v.cycleDelivered=0;v.tripsToday=(v.tripsToday||0)+1;v.tripsTotal=(v.tripsTotal||0)+1;if(mainLine?.tripLimit&&v.tripsTotal>=mainLine.tripLimit)mainLine.completedVehicleIds=[...new Set([...(mainLine.completedVehicleIds||[]),v.id])];}v.status='idle';v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;v.currentLeg=undefined;v.currentStop=undefined;
 if(v.pendingLineId!==undefined){const next=v.pendingLineId;v.pendingLineId=undefined;assignVehicle(s,v.id,next||'');continue;}if(!v.onReturnRoute&&line.id!==mainLine?.id)continue;}
 if(v.status==='idle'&&v.handlingUntil&&v.handlingUntil>s.day)continue;
 if(v.onReturnRoute&&(!line.active||line.deleted||line.endDay!==null&&line.endDay<=s.day)){if(v.status==='idle')startReturn(s,v);continue;}
 if(!mainLine?.active||mainLine.deleted||mainLine.endDay!==null&&s.day>=mainLine.endDay||!v.onReturnRoute&&mainLine.tripLimit&&(v.tripsTotal||0)>=mainLine.tripLimit){if(v.status==='idle'){if(mainLine?.tripLimit&&(v.tripsTotal||0)>=mainLine.tripLimit)mainLine.completedVehicleIds=[...new Set([...(mainLine.completedVehicleIds||[]),v.id])];startReturn(s,v);}continue;}
 if(v.status==='idle'){
  if(v.manualHold){const h=v.manualHold,st=line.stops[h.index];if(h.lineId===line.id&&isManualLine(line)&&st?.siteId===v.locationId){v.restReason='Wartet auf Go';continue;}v.manualHold=undefined;v.restReason=undefined;}
  if(v.manualReleased){if((v.manualReleased.readyAfterDay||0)>s.day+1e-10){v.restReason='Nahumschlag zum Ladedock läuft';continue;}const h=v.manualReleased,st=line.stops[h.index],place=siteById(s,h.siteId);v.manualReleased=undefined;if(h.lineId===line.id&&st?.siteId===v.locationId&&place){const before=vehicleCargo(v).reduce((n,c)=>n+c.quantity,0);v.manualGoods=h.goods;operateStop(s,v,{...line,good:'all'},{...st,good:'all'},place,market);v.manualGoods=undefined;const handled=(h.loadedQuantity||0)+Math.abs(vehicleCargo(v).reduce((n,c)=>n+c.quantity,0)-before);if(handled>0){v.handlingUntil=s.day+handlingDays(v,handled);v.handlingRulesVersion=15;v.restReason=st.action==='load'?'Beladen':'Entladen';}v.nextStop=(h.index+1)%line.stops.length;v.manualDepartureReady=true;v.restUntil=undefined;if(v.nextStop===0){if(returnLine?.active&&!returnLine.deleted&&(returnLine.endDay===null||returnLine.endDay>s.day)){v.onReturnRoute=!v.onReturnRoute;if(v.onReturnRoute)continue;}if((v.cycleDelivered||0)>.000001){v.cycleDelivered=0;v.tripsToday=(v.tripsToday||0)+1;v.tripsTotal=(v.tripsTotal||0)+1;if(mainLine?.tripLimit&&v.tripsTotal>=mainLine.tripLimit){mainLine.completedVehicleIds=[...new Set([...(mainLine.completedVehicleIds||[]),v.id])];continue;}}if(returnLine)continue;}} }
  if(v.manualDepartureReady){if(v.handlingUntil&&v.handlingUntil>s.day)continue;v.restReason=undefined;dispatch(s,v,line);if((v.status as Vehicle['status'])==='enroute')v.manualDepartureReady=false;continue;}
  const manualStop=line.stops[v.nextStop];if(isManualLine(line)){v.restUntil=undefined;v.dailyRestTargetId=undefined;v.dailyRestReturning=false;if(manualStop?.siteId===v.locationId)holdForManualDeparture(v,line,v.nextStop);else dispatch(s,v,line);continue;}
  if(v.dailyRestTargetId){returnForDailyRest(s,v,line);continue;}
  if(v.handlingUntil&&v.handlingUntil>s.day)continue;
  const reason=restReason(s,v,line,market);
  if(v.restUntil&&v.restUntil>s.day&&(!['Produzenten / Ladeorte heute leer','Tagesbedarf aller Endkunden erfüllt'].includes(v.restReason||'')||reason===v.restReason)){waitAtLoadPoint(s,v,line,v.restReason||reason);continue;}
  if(reason){v.restUntil=Math.floor(s.day)+1;waitAtLoadPoint(s,v,line,reason);continue;}
  v.restUntil=undefined;
  const work=line.stops.map((_,i)=>stopHasWork(s,v,line,i,market));
  if(!work.some(Boolean)){
   const source=line.stops.some(st=>st.action==='load'&&GOODS.some(g=>((st.good||line.good)==='all'||(st.good||line.good)===g.id)&&cargoCapacity(v,g.id)>0&&availableToLoad(s,st.siteId,g.id)>0));
   const containers=line.stops.some(st=>st.action==='load'&&(st.good||line.good)==='containers');
   const unchosen=containers&&line.stops.some(st=>st.action==='load'&&['all','containers'].includes(st.good||line.good)&&availableToLoad(s,st.siteId,'containers')>0&&!loadingContainerOrders(s,v,line,st,st.siteId).length);waitAtLoadPoint(s,v,line,unchosen?'Containerauftrag / Ziel auswählen':vehicleCargo(v).length||source?'Wartet auf passenden Abnehmer':containers?'Wartet auf Containerfracht':'Wartet auf Fracht im Lager');continue;
  }
  v.waitingForCargo=false;v.restReason=undefined;
  if(!work[v.nextStop]){const next=work.findIndex((yes,i)=>i>=v.nextStop&&yes);v.nextStop=next>=0?next:work.findIndex(Boolean);}
  dispatch(s,v,line);
 }


 }
 for(const line of s.lines)if(line.active&&!line.deleted&&line.tripLimit&&line.completedVehicleIds?.length&&!s.vehicles.some(v=>v.lineId===line.id||v.pendingLineId===line.id)){cancelLine(s,line.id);log(s,'Fahrtbegrenzung erfüllt: '+line.name+' wurde automatisch entfernt.','good');}
 for(const line of s.lines)if(line.active&&line.endDay!==null&&s.day>=line.endDay){line.active=false;log(s,`Linie ${line.name} ist planmäßig ausgelaufen.`);}
 if(s.day%30===0)log(s,`Monatsabschluss: ${euro(s.cash)} Kassenbestand.`);
 return s;}
export function stepDay(previous:State):State{return advanceEconomy(previous,1);}
/** Fractional world days, minute-sized time slices and exact arrival boundaries.
 * No full-day minimum journey or per-user clock in live worlds. */
export function stepTime(previous:State,targetDay:number,maxSlices=2000):State{
 let s=normalizeFreightState(structuredClone(previous));s.live=true;
 for(const line of s.lines.filter(l=>l.active&&l.mode==='rail')){const sites=line.stops.map(st=>s.sites.find(p=>p.id===st.siteId));if(sites.some(p=>!p)||sites.some((p,i)=>!railRoute([...s.tracks,...(s.borrowedTracks||[])],[p!.lat,p!.lon],[sites[(i+1)%sites.length]!.lat,sites[(i+1)%sites.length]!.lon])))cancelLine(s,line.id);}
 for(let i=0;s.day<targetDay-1e-10&&i<maxSlices;i++){
  let until=Math.min(targetDay,s.day+1/1440,Math.floor(s.day+1e-9)+1);
  for(const t of s.terminalTransfers||[])if(t.etaDay>s.day+1e-9)until=Math.min(until,t.etaDay);
  for(const v of s.vehicles)if(v.handlingUntil&&v.handlingUntil>s.day+1e-9)until=Math.min(until,v.handlingUntil);else if(v.etaDay&&v.etaDay>s.day+1e-9)until=Math.min(until,v.etaDay);
  if(until<=s.day+1e-10)until=Math.min(targetDay,s.day+1/1440);
  s=advanceEconomy(s,until-s.day);
 }
 return s;
}
export function checkIntegrity(s:State){for(const [site,goods] of Object.entries(s.inventory))for(const [g,v] of Object.entries(goods))if(!Number.isFinite(v)||Number(v)<-.0001)throw Error(`Negativer Bestand ${site}/${g}`);for(const [site,lots] of Object.entries(s.consignments||{}))for(const [order,qty] of Object.entries(lots))if(!Number.isFinite(qty)||qty<-.0001)throw Error(`Ungültige Containercharge ${site}/${order}`);for(const v of s.vehicles){const cargo=vehicleCargo(v);for(const c of cargo)if(!good(c.good)||!Number.isFinite(c.quantity)||c.quantity<0||c.quantity>Math.max(cargoCapacity(v,c.good),c.legacyCapacity||0)+.001)throw Error('Ungültige Fahrzeugladung');if(cargo.reduce((n,c)=>n+c.quantity/Math.max(cargoCapacity(v,c.good),c.legacyCapacity||0,1),0)>1.0001)throw Error('Fahrzeug überladen');}return true;}


/** All companies advance to the next global arrival, preserving physical delivery order. */
export function stepSharedWorld(previous:Map<string,State>,target:number,market:DailyMarket){
 const states=new Map([...previous].map(([id,s])=>[id,stepTime(s,s.day,0)]));if(!states.size){resetMarket(market,target);return states;}
 let day=Math.min(...[...states.values()].map(s=>s.day));
 for(let slice=0;day<target-1e-10&&slice<10000;slice++){
  let until=Math.min(target,day+1/1440,Math.floor(day+1e-9)+1);for(const s of states.values()){for(const t of s.terminalTransfers||[])if(t.etaDay>s.day+1e-9)until=Math.min(until,t.etaDay);
  for(const v of s.vehicles)if(v.handlingUntil&&v.handlingUntil>day+1e-9)until=Math.min(until,v.handlingUntil);else if(v.etaDay&&v.etaDay>day+1e-9)until=Math.min(until,v.etaDay);
  }resetMarket(market,until);for(const [id,s] of states)if(until>s.day)states.set(id,advanceEconomy(s,until-s.day,market));day=until;
 }
 return states;
}

/** Maximum payload after a valid purchasable body, trailer, wagon or cooling option. */
export function potentialCargoCapacity(modelId:VehicleModelId,id:GoodId){const m=VEHICLES.find(v=>v.id===modelId);if(!m)return 0;const base:Vehicle={id:'potential',modelId,locationId:'',nextStop:0,status:'idle'};if(m.attachment)return Math.max(0,...TRAILERS.filter(t=>t.mount===m.attachment).map(t=>cargoCapacity({...base,trailerId:t.id},id)));if(m.mode==='rail')return Math.max(0,...WAGONS.map(w=>cargoCapacity({...base,wagons:[{type:w.id,count:1}]},id)));return cargoCapacity({...base,cooling:m.mode==='van'},id);}
export function modelMatchesCargo(modelId:VehicleModelId,filter:string){if(filter==='all')return true;return GOODS.filter(g=>filter.startsWith('good:')?g.id===filter.slice(5):g.type===filter.replace('type:','')).some(g=>potentialCargoCapacity(modelId,g.id)>0);}

export function configurationMatchesCargo(modelId:VehicleModelId,filter:string,configuration:{trailerId?:string;wagons?:WagonSet[];cooling?:boolean}={}){if(filter==='all')return true;const v:Vehicle={id:'configuration',modelId,locationId:'',nextStop:0,status:'idle',...configuration};return GOODS.filter(g=>filter.startsWith('good:')?g.id===filter.slice(5):g.type===filter.replace('type:','')).some(g=>cargoCapacity(v,g.id)>0);}
