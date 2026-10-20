(function(root) {
'use strict';
const defaults = [
  ['english','学习英语','听说读写，保持语感','15 分钟','🌍','#e8edf5'],
  ['exercise','锻炼身体','动起来，照顾好自己','20 分钟','🌿','#e8efde'],
  ['baby','陪宝宝学习','放下手机，专心陪伴','20 分钟','🧸','#f6ebda'],
  ['tao','学习道家文化','读一段经典，记一点体会','10 分钟','☯','#e9e7f0'],
  ['ai','学习 AI','学一个方法，做一个小实践','20 分钟','✦','#e4eeee'],
  ['writing','练字','一笔一画，慢慢来','10 分钟','✍','#f1e8de']
];
const week = [0,1,2,3,4,5,6];
function dateKey(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDate(s) { return new Date(s+'T12:00:00'); }
function shift(s,n) { let d=parseDate(s); d.setDate(d.getDate()+n); return dateKey(d); }
function validDate(s) { return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDate(s))===s; }
function validAmount(n) { return typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1e9; }
function validGoal(n) { return validAmount(n) && n>0; }
function legacyTarget(target) {
  const m=target.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  return m && validGoal(+m[1]) ? {goal:+m[1],unit:(m[2].trim()||'次').slice(0,12)} : {goal:1,unit:'次'};
}
function entry(h,amount,note='') {
  if (amount!==null && !validAmount(amount)) throw Error('请输入有效的非负完成量');
  return {amount,goal:h.goal,unit:h.unit,done:amount!==null && amount/h.goal>=0.8,note};
}
function migrate(input,today=dateKey()) {
  validate(input);
  const s=JSON.parse(JSON.stringify(input));
  if(s.version===2) return s;
  for(const h of s.habits) Object.assign(h,legacyTarget(h.target));
  for(const records of Object.values(s.records)) {
    for(const [id,r] of Object.entries(records)) {
      const h=s.habits.find(h=>h.id===id);
      Object.assign(r,entry(h,r.done?h.goal:null,r.note),{legacy:true});
    }
  }
  if(!s.habits.some(h=>h.name==='不看短视频')) {
    let id='shortvideo';
    while(s.habits.some(h=>h.id===id)) id+='x';
    if(s.habits.length>=200) throw Error('请先减少习惯数量，再升级');
    s.habits.push({id,name:'不看短视频',desc:'把注意力留给真正重要的事',target:'1 天',goal:1,unit:'天',icon:'🌙',tint:'#e9e7f0',days:[...week],created:today,archived:null});
  }
  s.version=2;
  return validate(s);
}
function fresh(today=dateKey()) {
  return migrate({version:1,habits:defaults.map(([id,name,desc,target,icon,tint])=>({id,name,desc,target,icon,tint,days:[...week],created:today,archived:null})),records:{},lastBackup:null},today);
}
function scheduled(h,date) { return date>=h.created && (!h.archived||date<h.archived) && h.days.includes(parseDate(date).getDay()); }
function list(s,date) { return s.habits.filter(h=>scheduled(h,date)); }
function done(s,id,date) {
  const r=s.records[date]?.[id];
  if(!r) return false;
  if(Object.hasOwn(r,'amount')) return r.amount!==null && r.amount/r.goal>=0.8;
  return !!r.done;
}
function score(s,date) { const hs=list(s,date); return {total:hs.length,done:hs.filter(h=>done(s,h.id,date)).length}; }
function streak(s,h,today=dateKey()) {
  let n=0,d=today;
  if(scheduled(h,d)&&!done(s,h.id,d)) d=shift(d,-1);
  for(let i=0;i<36600&&d>=h.created;i++,d=shift(d,-1)) {
    if(!scheduled(h,d)) continue;
    if(!done(s,h.id,d)) break;
    n++;
  }
  return n;
}
function monthSummary(s,month,today=dateKey()) {
  if(!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01')) throw Error('月份不正确');
  const days=new Date(+month.slice(0,4),+month.slice(5),0).getDate();
  const result={planned:0,completed:0,rate:0,activeDays:0,fullDays:0,days:[],habits:[]};
  const rows=new Map(s.habits.map(h=>[h.id,{id:h.id,name:h.name,icon:h.icon,planned:0,completed:0,rate:0}]));
  for(let i=1;i<=days;i++) {
    const date=month+'-'+String(i).padStart(2,'0');
    if(date>today) break;
    let planned=0,completed=0,active=false;
    for(const h of list(s,date)) {
      const row=rows.get(h.id),passed=done(s,h.id,date),r=s.records[date]?.[h.id];
      planned++; row.planned++;
      if(passed) { completed++; row.completed++; }
      if(passed || r?.amount>0) active=true;
    }
    result.planned+=planned; result.completed+=completed;
    if(active) result.activeDays++;
    if(planned&&completed===planned) result.fullDays++;
    result.days.push({date,planned,completed,rate:planned?Math.round(completed/planned*100):0});
  }
  result.rate=result.planned?Math.round(result.completed/result.planned*100):0;
  result.habits=[...rows.values()].filter(r=>r.planned).map(r=>({...r,rate:Math.round(r.completed/r.planned*100)}));
  return result;
}
function validate(s) {
  if(!s||![1,2].includes(s.version)||!Array.isArray(s.habits)||s.habits.length>200||!s.records||typeof s.records!=='object'||Array.isArray(s.records)) throw Error('备份格式不正确');
  const ids=new Set();
  for(const h of s.habits) {
    if(!h||typeof h.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(h.id)||['__proto__','constructor','prototype'].includes(h.id)||ids.has(h.id)) throw Error('习惯编号不正确');
    ids.add(h.id);
    for(const [k,max] of [['name',40],['desc',160],['target',40],['icon',12],['tint',20]]) {
      if(typeof h[k]!=='string'||h[k].length>max) throw Error('习惯内容不正确');
    }
    if(!h.name.trim()||!/^#[a-fA-F0-9]{6}$/.test(h.tint)||!validDate(h.created)||(h.archived!==null&&!validDate(h.archived))||!Array.isArray(h.days)||!h.days.length||h.days.some(d=>!Number.isInteger(d)||d<0||d>6)) throw Error('习惯设置不正确');
    if(s.version===2&&(!validGoal(h.goal)||typeof h.unit!=='string'||!h.unit.trim()||h.unit.length>12)) throw Error('目标或单位不正确');
  }
  for(const [date,rs] of Object.entries(s.records)) {
    if(!validDate(date)||!rs||typeof rs!=='object'||Array.isArray(rs)) throw Error('记录日期不正确');
    for(const [id,r] of Object.entries(rs)) {
      if(!ids.has(id)||!r||typeof r.done!=='boolean'||typeof r.note!=='string'||r.note.length>2000) throw Error('打卡记录不正确');
      if(s.version===2&&((r.amount!==null&&!validAmount(r.amount))||!validGoal(r.goal)||typeof r.unit!=='string'||!r.unit.trim()||r.unit.length>12)) throw Error('完成量不正确');
    }
  }
  return s;
}
const api={dateKey,parseDate,shift,validDate,fresh,scheduled,list,done,score,streak,validate,migrate,entry,monthSummary};
if(typeof module!=='undefined') module.exports=api; else root.HabitCore=api;
})(typeof window!=='undefined'?window:globalThis);
