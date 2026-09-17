import RegionalHome from '../regional-home';
import {twMetadata} from '../../../lib/taiwan-catalog';
export const metadata={...twMetadata('我的設定','用預算照顧每一餐','/tw/profile'),robots:{index:false,follow:true}};
export default function Page(){return <RegionalHome/>;}
