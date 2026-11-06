import images from '../../data/logistics-product-images.json';
import {good} from '../../lib/logistics/engine';
export default function ProductImage({id}:{id:string}){
 if(!images.includes(id))return <span className="log-product-icon" role="img" aria-label={good(id)?.name||id}>{good(id)?.icon||'📦'}</span>;
 return <img className="log-product-image" src={'/logistics-products/'+id+'.webp'} alt={good(id)?.name||id} loading="lazy" decoding="async" width="64" height="64"/>;
}
