import type {FreightType,Mode} from './engine';
import extraVehicles from '../../data/logistics-extra-vehicles.json';
import extraTrailers from '../../data/logistics-extra-trailers.json';
import extraWagons from '../../data/logistics-extra-wagons.json';
import vehicleTuning from '../../data/logistics-vehicle-tuning.json';
export interface VehicleSpec {tier?:1|2|3;handling?:number;inland?:boolean;id:string;name:string;manufacturer:string;role:string;mode:Mode;types:FreightType[];capacity:number;price:number;cost:number;speed:number;icon:string;attachment?:string|null;source:string;factual:string}
export interface TrailerSpec {id:string;name:string;mount:string;types:FreightType[];capacity:number;goods:string[]|null;heavyOnly?:boolean;price:number;source:string;factual:string}
export interface WagonSpec {id:string;name:string;types:FreightType[];capacity:number;price:number;source:string}
export const REAL_VEHICLES:VehicleSpec[]=[
 {
  "id": "truck",
  "name": "MAN TGX 18.520 4x2 LL SA",
  "manufacturer": "MAN",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 114000,
  "cost": 260,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.man.eu/global/en/truck/all-models/overview.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "man-tgs",
  "name": "MAN TGS",
  "manufacturer": "MAN",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 115400,
  "cost": 262,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.man.eu/global/en/truck/all-models/overview.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "man-tgm",
  "name": "MAN TGM",
  "manufacturer": "MAN",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 116800,
  "cost": 264,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.man.eu/global/en/truck/all-models/overview.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "man-tgl",
  "name": "MAN TGL",
  "manufacturer": "MAN",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 118200,
  "cost": 266,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.man.eu/global/en/truck/all-models/overview.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "van",
  "name": "MAN TGE",
  "manufacturer": "MAN",
  "role": "van",
  "mode": "van",
  "types": [
   "general"
  ],
  "capacity": 1.5,
  "price": 39000,
  "cost": 85,
  "speed": 75,
  "icon": "🚐",
  "attachment": null,
  "source": "https://www.man.eu/global/en/truck/all-models/overview.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "mercedes-benz-actros-l-1848-ls-4x2",
  "name": "Mercedes-Benz Actros L 1848 LS 4x2",
  "manufacturer": "Mercedes-Benz",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 121000,
  "cost": 270,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.mercedes-benz-trucks.com/int/en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "mercedes-benz-actros-f",
  "name": "Mercedes-Benz Actros F",
  "manufacturer": "Mercedes-Benz",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 122400,
  "cost": 272,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.mercedes-benz-trucks.com/int/en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "mercedes-benz-arocs",
  "name": "Mercedes-Benz Arocs",
  "manufacturer": "Mercedes-Benz",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 123800,
  "cost": 274,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.mercedes-benz-trucks.com/int/en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "reefer",
  "name": "Mercedes-Benz Atego",
  "manufacturer": "Mercedes-Benz",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 125200,
  "cost": 276,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.mercedes-benz-trucks.com/int/en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "mercedes-benz-sprinter",
  "name": "Mercedes-Benz Sprinter",
  "manufacturer": "Mercedes-Benz",
  "role": "van",
  "mode": "van",
  "types": [
   "general"
  ],
  "capacity": 1.5,
  "price": 41500,
  "cost": 85,
  "speed": 75,
  "icon": "🚐",
  "attachment": null,
  "source": "https://www.mercedes-benz-trucks.com/int/en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "volvo-fh",
  "name": "Volvo FH",
  "manufacturer": "Volvo",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 128000,
  "cost": 280,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.volvotrucks.com/en-en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "volvo-fh16",
  "name": "Volvo FH16",
  "manufacturer": "Volvo",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 129400,
  "cost": 282,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.volvotrucks.com/en-en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "volvo-fh-aero",
  "name": "Volvo FH Aero",
  "manufacturer": "Volvo",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 130800,
  "cost": 284,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.volvotrucks.com/en-en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "volvo-fm",
  "name": "Volvo FM",
  "manufacturer": "Volvo",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 132200,
  "cost": 286,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.volvotrucks.com/en-en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "volvo-fmx",
  "name": "Volvo FMX",
  "manufacturer": "Volvo",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 133600,
  "cost": 288,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.volvotrucks.com/en-en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "volvo-fe",
  "name": "Volvo FE",
  "manufacturer": "Volvo",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 135000,
  "cost": 290,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.volvotrucks.com/en-en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "volvo-fl",
  "name": "Volvo FL",
  "manufacturer": "Volvo",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 136400,
  "cost": 292,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.volvotrucks.com/en-en/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "scania-s-serie",
  "name": "Scania S-Serie",
  "manufacturer": "Scania",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 137800,
  "cost": 294,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.scania.com/sg/en/home/products/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "scania-r-serie",
  "name": "Scania R-Serie",
  "manufacturer": "Scania",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 139200,
  "cost": 296,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.scania.com/sg/en/home/products/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "scania-g-serie",
  "name": "Scania G-Serie",
  "manufacturer": "Scania",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 140600,
  "cost": 298,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.scania.com/sg/en/home/products/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "scania-p-serie",
  "name": "Scania P-Serie",
  "manufacturer": "Scania",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 142000,
  "cost": 300,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.scania.com/sg/en/home/products/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "scania-l-serie",
  "name": "Scania L-Serie",
  "manufacturer": "Scania",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 143400,
  "cost": 302,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.scania.com/sg/en/home/products/trucks.html",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "daf-xf",
  "name": "DAF XF",
  "manufacturer": "DAF",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 144800,
  "cost": 304,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.daf.global/en-US/Trucks/New-Generation-DAF",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "daf-xg",
  "name": "DAF XG",
  "manufacturer": "DAF",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 146200,
  "cost": 306,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.daf.global/en-US/Trucks/New-Generation-DAF",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "daf-xgplus",
  "name": "DAF XG+",
  "manufacturer": "DAF",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 147600,
  "cost": 308,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.daf.global/en-US/Trucks/New-Generation-DAF",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "daf-xd",
  "name": "DAF XD",
  "manufacturer": "DAF",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 149000,
  "cost": 310,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.daf.global/en-US/Trucks/New-Generation-DAF",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "daf-xb",
  "name": "DAF XB",
  "manufacturer": "DAF",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 150400,
  "cost": 312,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.daf.global/en-US/Trucks/New-Generation-DAF",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "iveco-s-way",
  "name": "IVECO S-Way",
  "manufacturer": "IVECO",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 151800,
  "cost": 314,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.iveco.com/uk/Configurator",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "iveco-x-way",
  "name": "IVECO X-Way",
  "manufacturer": "IVECO",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 153200,
  "cost": 316,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.iveco.com/uk/Configurator",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "iveco-eurocargo",
  "name": "IVECO Eurocargo",
  "manufacturer": "IVECO",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 154600,
  "cost": 318,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.iveco.com/uk/Configurator",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "iveco-daily",
  "name": "IVECO Daily",
  "manufacturer": "IVECO",
  "role": "van",
  "mode": "van",
  "types": [
   "general"
  ],
  "capacity": 1.5,
  "price": 52000,
  "cost": 85,
  "speed": 75,
  "icon": "🚐",
  "attachment": null,
  "source": "https://www.iveco.com/uk/Configurator",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "renault-trucks-t",
  "name": "Renault Trucks T",
  "manufacturer": "Renault Trucks",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 157400,
  "cost": 322,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.renault-trucks.com/en/transport-and-urban-logistic-solutions/trucks",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "renault-trucks-t-high",
  "name": "Renault Trucks T High",
  "manufacturer": "Renault Trucks",
  "role": "tractor",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 158800,
  "cost": 324,
  "speed": 80,
  "icon": "🚛",
  "attachment": "semi",
  "source": "https://www.renault-trucks.com/en/transport-and-urban-logistic-solutions/trucks",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "renault-trucks-d",
  "name": "Renault Trucks D",
  "manufacturer": "Renault Trucks",
  "role": "rigid",
  "mode": "truck",
  "types": [],
  "capacity": 0,
  "price": 160200,
  "cost": 326,
  "speed": 80,
  "icon": "🚛",
  "attachment": "body",
  "source": "https://www.renault-trucks.com/en/transport-and-urban-logistic-solutions/trucks",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "renault-trucks-master",
  "name": "Renault Trucks Master",
  "manufacturer": "Renault Trucks",
  "role": "van",
  "mode": "van",
  "types": [
   "general"
  ],
  "capacity": 1.5,
  "price": 54000,
  "cost": 85,
  "speed": 75,
  "icon": "🚐",
  "attachment": null,
  "source": "https://www.renault-trucks.com/en/transport-and-urban-logistic-solutions/trucks",
  "factual": "Reales Modell / reale Baureihe. Preis, Betriebskosten und nutzbare Frachtkapazität sind Spielwerte."
 },
 {
  "id": "bulkRail",
  "name": "Siemens Vectron MS",
  "manufacturer": "Siemens",
  "role": "locomotive",
  "mode": "rail",
  "types": [],
  "capacity": 0,
  "price": 3200000,
  "cost": 1800,
  "speed": 100,
  "icon": "🚆",
  "source": "https://www.mobility.siemens.com/global/en/portfolio/rolling-stock/locomotives/vectron.html",
  "factual": "Lokomotive ohne eigene Ladekapazität; Kapazität durch Wagenverband."
 },
 {
  "id": "containerRail",
  "name": "Alstom Traxx Universal",
  "manufacturer": "Alstom",
  "role": "locomotive",
  "mode": "rail",
  "types": [],
  "capacity": 0,
  "price": 3200000,
  "cost": 1800,
  "speed": 100,
  "icon": "🚆",
  "source": "https://www.alstom.com/solutions/rolling-stock/locomotives/traxx-universal-locomotives-superior-performance-passenger-and-freight-operations",
  "factual": "Lokomotive ohne eigene Ladekapazität; Kapazität durch Wagenverband."
 },
 {
  "id": "flatRail",
  "name": "Stadler EURO9000",
  "manufacturer": "Stadler",
  "role": "locomotive",
  "mode": "rail",
  "types": [],
  "capacity": 0,
  "price": 3200000,
  "cost": 1800,
  "speed": 100,
  "icon": "🚆",
  "source": "https://www.stadlerrail.com/api/docs/x/45f0a05abf/euro9000-en.pdf",
  "factual": "Lokomotive ohne eigene Ladekapazität; Kapazität durch Wagenverband."
 },
 {
  "id": "cargoShip",
  "name": "Damen Container Feeder 800",
  "manufacturer": "Damen",
  "role": "ship",
  "mode": "ship",
  "types": [
   "container",
   "general",
   "chilled",
   "pharma"
  ],
  "capacity": 7800,
  "price": 10500000,
  "cost": 4300,
  "speed": 31.5,
  "icon": "🚢",
  "source": "https://medialibrary.damen.com/m/2be43bb54e194b64/original/specification-container-feeders-800.pdf",
  "factual": "788 TEU, 90 Kühlcontaineranschlüsse; 9.300 t DWT (einschließlich Vorräte). Nutzbare Tonnenkapazität im Spiel vereinfacht. DWT ist nicht gleich reine Frachtmasse."
 },
 {
  "id": "bulkShip",
  "name": "Damen Combi Freighter 5000",
  "manufacturer": "Damen",
  "role": "ship",
  "mode": "ship",
  "types": [
   "bulk",
   "heavy",
   "general"
  ],
  "capacity": 4500,
  "price": 10500000,
  "cost": 4300,
  "speed": 22.2,
  "icon": "🚢",
  "source": "https://www.damen.com/vessels/cargo/multi-purpose-cargo-vessels/combi-freighter-5000",
  "factual": "5.130 t DWT, 7.001 m³; 12 kn. Nutzbare Tonnenkapazität im Spiel vereinfacht. DWT ist nicht gleich reine Frachtmasse."
 },
 {
  "id": "damen-cc2750",
  "name": "Damen Combi Coaster 2750",
  "manufacturer": "Damen",
  "role": "ship",
  "mode": "ship",
  "types": [
   "bulk",
   "general",
   "heavy"
  ],
  "capacity": 2200,
  "price": 10500000,
  "cost": 4300,
  "speed": 19.6312,
  "icon": "🚢",
  "source": "https://www.damen.com/vessels/cargo/multi-purpose-cargo-vessels/combi-coaster-2750",
  "factual": "2.750 t DWT und 3.790 m³ Laderaum. Nutzbare Tonnenkapazität im Spiel vereinfacht. DWT ist nicht gleich reine Frachtmasse."
 },
 {
  "id": "damen-cf3850",
  "name": "Damen Combi Freighter 3850",
  "manufacturer": "Damen",
  "role": "ship",
  "mode": "ship",
  "types": [
   "bulk",
   "general",
   "heavy",
   "container"
  ],
  "capacity": 3200,
  "price": 10500000,
  "cost": 4300,
  "speed": 21.9,
  "icon": "🚢",
  "source": "https://www.damen.com/vessels/cargo/multi-purpose-cargo-vessels/combi-freighter-3850",
  "factual": "3.800 t DWT, 5.250 m³; 11,8 kn. Nutzbare Tonnenkapazität im Spiel vereinfacht. DWT ist nicht gleich reine Frachtmasse."
 },
 {
  "id": "boeing-737-800bcf",
  "name": "Boeing 737-800BCF",
  "manufacturer": "Boeing",
  "role": "aircraft",
  "mode": "air",
  "types": [
   "general",
   "container",
   "chilled",
   "pharma"
  ],
  "capacity": 24,
  "price": 24600000,
  "cost": 9220,
  "speed": 820,
  "icon": "✈️",
  "source": "https://www.boeing.com/commercial/freighters",
  "factual": "Bis 24 t Brutto-Strukturnutzlast; Nettofracht abhängig von Ausrüstung und Einsatz."
 },
 {
  "id": "boeing-767-300f",
  "name": "Boeing 767-300F",
  "manufacturer": "Boeing",
  "role": "aircraft",
  "mode": "air",
  "types": [
   "general",
   "container",
   "chilled",
   "pharma"
  ],
  "capacity": 57,
  "price": 37800000,
  "cost": 10210,
  "speed": 820,
  "icon": "✈️",
  "source": "https://www.boeing.com/commercial/freighters",
  "factual": "Bis 57 t Brutto-Strukturnutzlast; Nettofracht abhängig von Ausrüstung und Einsatz."
 },
 {
  "id": "cargoPlane",
  "name": "Boeing 777F",
  "manufacturer": "Boeing",
  "role": "aircraft",
  "mode": "air",
  "types": [
   "general",
   "container",
   "chilled",
   "pharma"
  ],
  "capacity": 107,
  "price": 57800000,
  "cost": 11710,
  "speed": 820,
  "icon": "✈️",
  "source": "https://www.boeing.com/commercial/freighters",
  "factual": "Bis 107 t Brutto-Strukturnutzlast; Nettofracht abhängig von Ausrüstung und Einsatz."
 },
 {
  "id": "airbus-a330-200f",
  "name": "Airbus A330-200F",
  "manufacturer": "Airbus",
  "role": "aircraft",
  "mode": "air",
  "types": [
   "general",
   "container",
   "chilled",
   "pharma"
  ],
  "capacity": 70,
  "price": 43000000,
  "cost": 10600,
  "speed": 820,
  "icon": "✈️",
  "source": "https://www.airbus.com/sites/g/files/jlcbta136/files/2024-07/Airbus-A330-Facts-and-Figures-July%202024.pdf",
  "factual": "Bis 70 t Brutto-Strukturnutzlast; Nettofracht abhängig von Ausrüstung und Einsatz."
 }
];
export const TRAILERS:TrailerSpec[]=[
 {
  "id": "krone-profi",
  "name": "KRONE Profi Liner SDP 27 eLB50-CS",
  "mount": "semi",
  "types": [
   "general"
  ],
  "capacity": 24,
  "goods": null,
  "price": 39000,
  "source": "https://www.krone-trailer.com/en/products/curtain-semitrailer/profi-liner/",
  "factual": "33,06 t technisch mögliche Nutzlast; im Spiel 24 t für das Gespann."
 },
 {
  "id": "krone-profi-hd",
  "name": "KRONE Profi Liner HD",
  "mount": "semi",
  "types": [
   "general",
   "heavy"
  ],
  "capacity": 26,
  "goods": [
   "steel",
   "steelBeams",
   "steelCoils",
   "machineryParts",
   "concreteElements"
  ],
  "price": 49000,
  "source": "https://www.krone-trailer.com/en/products/curtain-semitrailer/profi-liner-hd/",
  "factual": "Technisch bis 36,3 t Nutzlast, je Variante."
 },
 {
  "id": "krone-mega",
  "name": "KRONE Mega Liner Plus",
  "mount": "semi",
  "types": [
   "general"
  ],
  "capacity": 24,
  "goods": null,
  "price": 46000,
  "source": "https://www.krone-trailer.com/fileadmin/media/downloads/Datenblaetter/Mega_Liner/Mega_Liner_Plus_GB.pdf",
  "factual": "Volumenauflieger; technische Nutzlast variantenabhängig."
 },
 {
  "id": "krone-cool",
  "name": "KRONE Cool Liner SDR 27",
  "mount": "semi",
  "types": [
   "chilled",
   "general"
  ],
  "capacity": 22,
  "goods": null,
  "price": 78000,
  "source": "https://www.krone-trailer.com/en/products/refrigerated-semi-trailer/cool-liner",
  "factual": "Kühlausführung, Innenraum 13,31 × 2,46 × 2,63 m."
 },
 {
  "id": "krone-dry",
  "name": "KRONE Dry Liner",
  "mount": "semi",
  "types": [
   "general"
  ],
  "capacity": 24,
  "goods": null,
  "price": 45000,
  "source": "https://www.krone-trailerparts.com/control/cms?webPageId=10031",
  "factual": "Geschlossener Kofferauflieger."
 },
 {
  "id": "krone-coil",
  "name": "KRONE Coil Liner",
  "mount": "semi",
  "types": [
   "heavy"
  ],
  "capacity": 26,
  "goods": [
   "steelCoils",
   "steel",
   "copper",
   "aluminium"
  ],
  "price": 52000,
  "source": "https://www.krone-trailerparts.com/control/cms?webPageId=10031",
  "factual": "Coilmulde; Ladungssicherung abhängig vom Produkt."
 },
 {
  "id": "krone-paper",
  "name": "KRONE Paper Liner",
  "mount": "semi",
  "types": [
   "general"
  ],
  "capacity": 24,
  "goods": [
   "paper",
   "cardboard",
   "packaging"
  ],
  "price": 51000,
  "source": "https://www.krone-trailerparts.com/control/cms?webPageId=10031",
  "factual": "Für Papierrollen ausgelegte Aufliegerfamilie."
 },
 {
  "id": "krone-box",
  "name": "KRONE Box Liner SDC 27 eL40",
  "mount": "semi",
  "types": [
   "container"
  ],
  "capacity": 28,
  "goods": null,
  "price": 42000,
  "source": "https://www.krone-trailer.com/en/products/container-chassis/box-liner-el40-flach-40/45",
  "factual": "1×40 ft, 2×20 ft oder 1×20 ft nach Beladeplan."
 },
 {
  "id": "krone-tank-container",
  "name": "KRONE Box Liner SDC 27 eLTU40-2",
  "mount": "semi",
  "types": [
   "liquid",
   "hazardous"
  ],
  "capacity": 26,
  "goods": null,
  "price": 72000,
  "source": "https://www.krone-trailer.com/produkte/container-chassis/box-liner-eltu40/45-universal-45/",
  "factual": "Mit passend zugelassenem Tankcontainer im Spiel; Chassis selbst ist kein Tank."
 },
 {
  "id": "schmitz-universal",
  "name": "Schmitz Cargobull S.CS UNIVERSAL",
  "mount": "semi",
  "types": [
   "general"
  ],
  "capacity": 24,
  "goods": null,
  "price": 41000,
  "source": "https://www.cargobull.com/en-ov/media-center/products",
  "factual": "Planenauflieger, Nutzlast aus der gewählten Variante."
 },
 {
  "id": "schmitz-mega",
  "name": "Schmitz Cargobull S.CS MEGA",
  "mount": "semi",
  "types": [
   "general"
  ],
  "capacity": 24,
  "goods": null,
  "price": 47000,
  "source": "https://www.cargobull.com/en-ov/media-center/products",
  "factual": "Volumenauflieger."
 },
 {
  "id": "schmitz-cool",
  "name": "Schmitz Cargobull S.KO COOL",
  "mount": "semi",
  "types": [
   "chilled",
   "general",
   "pharma"
  ],
  "capacity": 22,
  "goods": null,
  "price": 96000,
  "source": "https://www.cargobull.com/fr-ch/-/media/project/scb-sites/scb-global-site/media-center-en/brief-information-sko-cool-smart-executive-plus.pdf",
  "factual": "Im Spiel als qualifizierte temperaturgeführte Pharma-Konfiguration ausgewählt."
 },
 {
  "id": "schmitz-kipper",
  "name": "Schmitz Cargobull S.KI LIGHT",
  "mount": "semi",
  "types": [
   "bulk"
  ],
  "capacity": 27,
  "goods": null,
  "price": 57000,
  "source": "https://www.cargobull.com/en-ov/media-center/products",
  "factual": "Kippauflieger; Bauarten unterscheiden sich nach Dichte/Volumen."
 },
 {
  "id": "schmitz-container",
  "name": "Schmitz Cargobull S.CF LIGHT 40/45",
  "mount": "semi",
  "types": [
   "container"
  ],
  "capacity": 27,
  "goods": null,
  "price": 43000,
  "source": "https://www.cargobull.com/en/use/intermodal-transport",
  "factual": "40-/45-ft-Container nach Ausführung."
 },
 {
  "id": "schwarzmueller-timber",
  "name": "Schwarzmüller 3-Achs-Rungen-Sattelanhänger mit Plateau",
  "mount": "semi",
  "types": [
   "heavy"
  ],
  "capacity": 25,
  "goods": [
   "timber",
   "lumber"
  ],
  "price": 61000,
  "source": "https://schwarzmueller.com/en/vehicles/timber-stanchion-vehicles/timber-stanchion-semitrailers/3-axle-timber-stanchion-semitrailer-with-platform/",
  "factual": "Holz-/Langgutauflieger mit Rungen. Keine beliebigen anderen Schwerlastgüter."
 },
 {
  "id": "feldbinder-silo",
  "name": "Feldbinder EUT",
  "mount": "semi",
  "types": [
   "bulk"
  ],
  "capacity": 26,
  "goods": [
   "flour",
   "cement",
   "sugar",
   "salt",
   "fertilizer"
  ],
  "price": 69000,
  "source": "https://www.feldbinder.com/en/road.html",
  "factual": "Silosattelauflieger, Produktfamilie 31–60 m³."
 },
 {
  "id": "fliegl-ass",
  "name": "Fliegl ASS",
  "mount": "semi",
  "types": [
   "bulk"
  ],
  "capacity": 26,
  "goods": null,
  "price": 65000,
  "source": "https://fliegl-baukom.de/",
  "factual": "Abschiebe-Sattelauflieger für landwirtschaftliches Schüttgut."
 },
 {
  "id": "faymonville-multimax",
  "name": "Faymonville MultiMAX",
  "mount": "semi",
  "types": [
   "heavy"
  ],
  "capacity": 60,
  "goods": [
   "machines",
   "vehicles",
   "machineryParts",
   "concreteElements",
   "steelBeams"
  ],
  "price": 185000,
  "source": "https://www.faymonville.com/products/semi-trailer/multimax/",
  "factual": "2–10 Achsen, ausführungsspezifisch bis 120 t Nutzlast; Spielkonfiguration 60 t."
 },
 {
  "id": "body-box",
  "name": "Schmitz Cargobull M.KO Kofferaufbau",
  "mount": "body",
  "types": [
   "general"
  ],
  "capacity": 12,
  "goods": null,
  "price": 28000,
  "source": "https://www.cargobull.com/en/products",
  "factual": "Kofferaufbau für Motorwagen; gewählte Kapazität ist Spielwert."
 },
 {
  "id": "body-cool",
  "name": "Schmitz Cargobull M.KO COOL",
  "mount": "body",
  "types": [
   "chilled",
   "pharma"
  ],
  "capacity": 10,
  "goods": null,
  "price": 59000,
  "source": "https://www.cargobull.com/en/products",
  "factual": "Temperaturgeführter Motorwagenaufbau, Pharma-Konfiguration im Spiel."
 },
 {
  "id": "body-timber",
  "name": "Schwarzmüller Rungenaufbau",
  "mount": "body",
  "types": [
   "heavy"
  ],
  "capacity": 12,
  "goods": [
   "timber",
   "lumber"
  ],
  "price": 34000,
  "source": "https://schwarzmueller.com/en/vehicles/timber-stanchion-vehicles/",
  "factual": "Rungenaufbau für Holz-/Langguttransport."
 }
];
export const REAL_WAGONS:WagonSpec[]=[
 {
  "id": "bulk",
  "name": "Tatravagónka Tagnpps 95 m³",
  "types": [
   "bulk"
  ],
  "capacity": 69.4,
  "price": 94000,
  "source": "https://tatravagonka.sk/wagons/tagnpps-95-m%C2%B3/"
 },
 {
  "id": "container",
  "name": "NYMWAG Sggrss 80′",
  "types": [
   "container",
   "general"
  ],
  "capacity": 108.5,
  "price": 182000,
  "source": "https://nymwag.com/products/intermodal-platforms/sggrss-80"
 },
 {
  "id": "flat",
  "name": "Tatravagónka Shimmns",
  "types": [
   "heavy"
  ],
  "capacity": 68,
  "price": 126000,
  "source": "https://tatravagonka.sk/wagons/shimmns/"
 },
 {
  "id": "covered",
  "name": "Tatravagónka Habbiins(s)",
  "types": [
   "general"
  ],
  "capacity": 64.1,
  "price": 129000,
  "source": "https://tatravagonka.sk/wagons/habbiillnss-2/?lang=en"
 },
 {
  "id": "refrigerated",
  "name": "NYMWAG Sggrss 80′ mit Kühlcontainern",
  "types": [
   "chilled",
   "pharma"
  ],
  "capacity": 72,
  "price": 215000,
  "source": "https://nymwag.com/products/intermodal-platforms/sggrss-80"
 },
 {
  "id": "rollingRoad",
  "name": "Sdggmrss T3000e Taschenwagen",
  "types": [
   "general",
   "heavy",
   "container"
  ],
  "capacity": 100,
  "price": 205000,
  "source": "https://www.ermewa.com/en/wagons/pocket-wagon-sggmrss-t3000e/"
 },
 {
  "id": "tank",
  "name": "Tatravagónka Zacns 93 m³",
  "types": [
   "liquid",
   "hazardous"
  ],
  "capacity": 65,
  "price": 155000,
  "source": "https://tatravagonka.sk/wagons/zacns-93m/?lang=de"
 },
 {
  "id": "open",
  "name": "Tatravagónka Eanoss",
  "types": [
   "bulk",
   "heavy"
  ],
  "capacity": 65,
  "price": 98000,
  "source": "https://tatravagonka.sk/inc/uploads/2016/06/eanoss.pdf"
 }
];

REAL_VEHICLES.push(...extraVehicles as VehicleSpec[]);
TRAILERS.push(...(extraTrailers as TrailerSpec[]).filter(t=>!TRAILERS.some(x=>x.id===t.id)));
REAL_WAGONS.push(...(extraWagons as WagonSpec[]).filter(w=>!REAL_WAGONS.some(x=>x.id===w.id)));
for(const v of REAL_VEHICLES){const t=(vehicleTuning as Record<string,{tier:1|2|3;speed:number;handling:number;price:number}>)[v.id];if(t){v.tier=t.tier;v.speed=t.speed;v.handling=t.handling;v.price=t.price;}else if(v.mode==='ship'||v.mode==='air'||v.mode==='rail'){v.tier=v.mode==='rail'?(v.speed>=140?3:v.speed>=110?2:1):2;v.handling=v.mode==='rail'?(v.speed>=140?.9:v.speed>=110?1:1.1):1;}}
for(const v of REAL_VEHICLES)v.capacity*=10;
for(const t of TRAILERS)t.capacity*=10;
for(const w of REAL_WAGONS)w.capacity*=10;

const lowLoader=TRAILERS.find(t=>t.id==='faymonville-multimax');if(lowLoader){lowLoader.types=['heavy'];lowLoader.heavyOnly=true;lowLoader.goods=null;}
