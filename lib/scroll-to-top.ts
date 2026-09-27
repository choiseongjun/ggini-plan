/** Reset both the mobile page and any desktop app scroll containers. */
export function scrollToAppTop(anchor:HTMLElement|null){
 for(let element=anchor;element;element=element.parentElement){
  element.scrollTo({top:0,left:0,behavior:'instant'});
 }
 window.scrollTo({top:0,left:0,behavior:'instant'});
}
