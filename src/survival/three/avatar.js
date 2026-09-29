import * as T from '/vendor/three/three.module.js';
import {GLTFLoader,VRMLoaderPlugin,VRMUtils} from '/vendor/vrm/avatar-loader.js';
import {characterPose} from './character-motion.js';

export async function createAvatar(parent,member,index){
  const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
  let vrm;
  try{
    const gltf=await loader.loadAsync('/assets/survival-3d/characters/woni-base.vrm');
    vrm=gltf.userData.vrm;if(!vrm)throw new Error('No VRM humanoid');
  }catch(cause){const error=new Error('캐릭터 모델을 불러오지 못했어요. 다시 열어 주세요.',{cause});error.code='AVATAR_LOAD';throw error;}
  VRMUtils.rotateVRM0(vrm);
  const root=new T.Group();root.position.set(member.x,0,member.z);root.rotation.y=member.yaw;
  root.userData.member=index;root.userData.articulated=true;parent.add(root);root.add(vrm.scene);
  vrm.scene.userData.externalAvatar=true;
  const bone=name=>vrm.humanoid.getNormalizedBoneNode(name);
  root.updateMatrixWorld(true);
  const headY=bone('head').getWorldPosition(new T.Vector3()).y,hipY=bone('hips').getWorldPosition(new T.Vector3()).y;
  vrm.scene.scale.setScalar(1.16/(headY-hipY));
  const skins=[],materials=new Map();
  vrm.scene.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true;o.receiveShadow=true;
      o.material=(Array.isArray(o.material)?o.material:[o.material]).map(original=>{
        if(materials.has(original))return materials.get(original);
        const m=new T.MeshStandardMaterial({name:original.name,map:original.map,color:original.color,transparent:original.transparent,opacity:original.opacity,alphaTest:original.alphaTest,side:original.side,depthWrite:original.depthWrite,roughness:original.name.includes('HAIR')?.68:.85,metalness:0});
        if(original.name.includes('HAIR'))m.color.set('#49372f');
        if(original.name.includes('EyeIris')){
          m.color.set('#ffffff');
          m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat irisValue = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));\ndiffuseColor.rgb = irisValue * vec3(0.48, 0.26, 0.10);');};
          m.customProgramCacheKey=()=> 'rescene-brown-iris-v1';
        }
        materials.set(original,m);return m;
      });
      if(o.material.length===1)o.material=o.material[0];
    }
    if(o.isSkinnedMesh){o.frustumCulled=false;o.boundingSphere=new T.Sphere(new T.Vector3(),4);skins.push(o);}
  });
  root.updateMatrixWorld(true);
  const hips=root.worldToLocal(bone('hips').getWorldPosition(new T.Vector3()));
  vrm.scene.position.y=.84-hips.y;
  const avatar={root,vrm,index,baseYaw:member.yaw,greetingAt:null,bone,skins,kind:'vrm',baseY:vrm.scene.position.y};
  updateAvatar(avatar,0,0);return avatar;
}

// Aim a normalized human bone in room coordinates. This works for both VRM 0
// and 1 axis conventions and keeps hands/feet attached to their actual skeleton.
function aim(avatar,name,childName,direction){
  const bone=avatar.bone(name),child=avatar.bone(childName);if(!bone||!child)return;
  avatar.root.updateWorldMatrix(true,true);
  const from=child.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize();
  const to=new T.Vector3(...direction).normalize().applyQuaternion(avatar.root.getWorldQuaternion(new T.Quaternion()));
  const delta=new T.Quaternion().setFromUnitVectors(from,to);
  const world=bone.getWorldQuaternion(new T.Quaternion()).premultiply(delta);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
}

function orientHand(avatar,side,direction,lift){
  const hand=avatar.bone(side+'Hand'),finger=avatar.bone(side+'MiddleProximal');if(!hand||!finger)return;
  avatar.root.updateWorldMatrix(true,true);
  const rotation=avatar.root.getWorldQuaternion(new T.Quaternion());
  const x=new T.Vector3(...direction).normalize().multiplyScalar(Math.sign(finger.position.x)||1).applyQuaternion(rotation);
  const up=new T.Vector3(0,1-lift,-lift).normalize().applyQuaternion(rotation);
  const z=new T.Vector3().crossVectors(x,up).normalize(),y=new T.Vector3().crossVectors(z,x).normalize();
  const world=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
}

export function updateAvatar(avatar,time,gaze){
  const pose=characterPose(time,avatar.index,avatar.greetingAt),v=avatar.vrm;
  v.humanoid.resetNormalizedPose();v.scene.position.y=avatar.baseY+pose.breath;
  aim(avatar,'spine','chest',[0,1,.065]);
  for(const [side,sign] of [['left',1],['right',-1]]){
    aim(avatar,side+'UpperLeg',side+'LowerLeg',[sign*.07,.045,1]);
    aim(avatar,side+'LowerLeg',side+'Foot',[0,-1,.10]);
    const lift=side==='left'?pose.lift:0;
    aim(avatar,side+'UpperArm',side+'LowerArm',[sign*(.20+lift*.70),-.98+lift*.70,.14]);
    aim(avatar,side+'LowerArm',side+'Hand',[sign*(.04+lift*.08),.25+lift*.75,1-lift*.90]);
    orientHand(avatar,side,[sign*(.04+lift*pose.flutter*.25),-.10+lift*1.1,1-lift*.9],lift);
  }
  const head=avatar.bone('head');head.rotation.y=gaze;head.rotation.x=-pose.nod;head.rotation.z=pose.tilt;
  v.expressionManager?.setValue('happy',pose.smile*.45);
  v.expressionManager?.setValue('blink',1-pose.blink);
  v.update(0);avatar.root.updateMatrixWorld(true);
  // The conservative local bounds set at load encompass every supported pose.
  return pose;
}
