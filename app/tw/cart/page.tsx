import RegionalHome from '../regional-home';
import {twMetadata} from '../../../lib/taiwan-catalog';
export const metadata={...twMetadata('購物清單','用預算照顧每一餐','/tw/cart'),robots:{index:false,follow:true}};
export default function Page(){return <RegionalHome/>;}
