import {register} from 'node:module';
register('data:text/javascript,'+encodeURIComponent(`import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';
export async function resolve(spec,ctx,next){if((spec.startsWith('.')||spec.startsWith('/'))&&!/\\.(m?[jt]s|json)$/.test(spec)){for(const ext of ['.ts','.tsx','/index.ts']){try{const u=new URL(spec+ext,ctx.parentURL);if(existsSync(fileURLToPath(u)))return next(u.href,ctx);}catch{}}}if(spec.endsWith('.json'))return {...await next(spec,ctx),importAttributes:{type:'json'}};return next(spec,ctx);}`));
