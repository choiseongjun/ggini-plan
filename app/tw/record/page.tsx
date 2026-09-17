import RegionalHome from '../regional-home';
import {twMetadata} from '../../../lib/taiwan-catalog';
export const metadata={...twMetadata('用餐紀錄','用預算照顧每一餐','/tw/record'),robots:{index:false,follow:true}};
export default function Page(){return <RegionalHome/>;}
