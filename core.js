(function(root){
'use strict';
const defaults=[['english','学习英语','听说读写，保持语感','15 分钟','🌍','#e8edf5'],['exercise','锻炼身体','动起来，照顾好自己','20 分钟','🌿','#e8efde'],['baby','陪宝宝学习','放下手机，专心陪伴','20 分钟','🧸','#f6ebda'],['tao','学习道家文化','读一段经典，记一点体会','10 分钟','☯','#e9e7f0'],['ai','学习 AI','学一个方法，做一个小实践','20 分钟','✦','#e4eeee'],['writing','练字','一笔一画，慢慢来','10 分钟','✍','#f1e8de']];
function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function parseDate(s){return new Date(s+'T12:00:00');}
function shift(s,n){let d=parseDate(s);d.setDate(d.getDate()+n);return dateKey(d);}
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dateKey(parseDate(s))===s;}
function fresh(today=dateKey()){return {version:1,habits:defaults.map(([id,name,desc,target,icon,tint])=>({id,name,desc,target,icon,tint,days:[0,1,2,3,4,5,6],created:today,archived:null})),records:{},lastBackup:null};}
function scheduled(h,date){return date>=h.created&&(!h.archived||date<h.archived)&&h.days.includes(parseDate(date).getDay());}
function list(s,date){return s.habits.filter(h=>scheduled(h,date));}
function done(s,id,date){return !!s.records[date]?.[id]?.done;}
function score(s,date){let hs=list(s,date);return {total:hs.length,done:hs.filter(h=>done(s,h.id,date)).length};}
function streak(s,h,today=dateKey()){let n=0,d=today;if(scheduled(h,d)&&!done(s,h.id,d))d=shift(d,-1);for(let i=0;i<36600&&d>=h.created;i++,d=shift(d,-1)){if(!scheduled(h,d))continue;if(!done(s,h.id,d))break;n++;}return n;}
function validate(s){if(!s||s.version!==1||!Array.isArray(s.habits)||s.habits.length>200||!s.records||typeof s.records!=='object'||Array.isArray(s.records))throw Error('备份格式不正确');const ids=new Set();for(const h of s.habits){if(!h||typeof h.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(h.id)||ids.has(h.id))throw Error('习惯编号不正确');ids.add(h.id);for(const [k,max] of [['name',40],['desc',160],['target',40],['icon',12],['tint',20]])if(typeof h[k]!=='string'||h[k].length>max)throw Error('习惯内容不正确');if(!h.name.trim()||!/^#[a-fA-F0-9]{6}$/.test(h.tint)||!validDate(h.created)||(h.archived!==null&&!validDate(h.archived))||!Array.isArray(h.days)||!h.days.length||h.days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('习惯设置不正确');}for(const [date,rs] of Object.entries(s.records)){if(!validDate(date)||!rs||typeof rs!=='object'||Array.isArray(rs))throw Error('记录日期不正确');for(const [id,r] of Object.entries(rs)){if(!ids.has(id)||!r||typeof r.done!=='boolean'||typeof r.note!=='string'||r.note.length>2000)throw Error('打卡记录不正确');}}return s;}
const api={dateKey,parseDate,shift,validDate,fresh,scheduled,list,done,score,streak,validate};if(typeof module!=='undefined')module.exports=api;else root.HabitCore=api;
})(typeof window!=='undefined'?window:globalThis);
