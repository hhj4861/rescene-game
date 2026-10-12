// Most recently pressed direction wins; releasing it resumes the previous hold.
export function heldInput(){
 const pressed=new Map();
 return {
  press(id,action){if(!pressed.has(id))pressed.set(id,action);return this.current;},
  has(id){return pressed.has(id);},
  release(id){pressed.delete(id);return this.current;},
  clear(){pressed.clear();},
  get current(){const action=[...pressed.values()].at(-1);return action?{action,wait:.08}:null;},
 };
}
