import { MealLog, Profile, VitalLog } from './types';
export function targets(p?:Partial<Profile>) { const w=Number(p?.weight)||70,h=Number(p?.height)||170,age=Number(p?.age)||45,activity=Number(p?.activity)||1.35; const bmr=(10*w)+(6.25*h)-(5*age)+(p?.gender==='female'?-161:5); let cal=Math.round(bmr*activity); if(p?.goal==='loss') cal-=350; if(p?.goal==='gain') cal+=250; if(p?.goal==='elder-maintain') cal=Math.max(1500,cal-120); const female=p?.gender==='female'; return { calories:Math.max(1200,cal), protein:Math.round(w*(age>=60?1.05:.9)), fiber:age>=60?28:32, sugar:30, sodium:1800, potassium:3500, calcium:age>=60||female?1200:1000, iron:female&&age<51?18:12, vitaminA:female?700:900, vitaminC:female?75:90 }; }
export function sumMeals(items:MealLog[]){ return items.reduce((a,x)=>({cal:a.cal+(+x.cal||0),p:a.p+(+x.p||0),c:a.c+(+x.c||0),f:a.f+(+x.f||0),fiber:a.fiber+(+x.fiber||0),sugar:a.sugar+(+x.sugar||0),sodium:a.sodium+(+x.sodium||0),potassium:a.potassium+(+(x.potassium||0)),calcium:a.calcium+(+(x.calcium||0)),iron:a.iron+(+(x.iron||0)),vitaminA:a.vitaminA+(+(x.vitaminA||0)),vitaminC:a.vitaminC+(+(x.vitaminC||0))}),{cal:0,p:0,c:0,f:0,fiber:0,sugar:0,sodium:0,potassium:0,calcium:0,iron:0,vitaminA:0,vitaminC:0}); }
export function healthScore(meals:MealLog[], vitals:VitalLog[], profile?:Partial<Profile>){
 const t=targets(profile); const s=sumMeals(meals); const v=vitals[0];
 const hasFood = meals.length > 0 || s.cal > 0;
 const hasVitals = Boolean(v && ((v.water||0)>0 || (v.steps||0)>0 || (v.glucose||0)>0 || (v.bpSys||0)>0));
 if(!hasFood && !hasVitals) return 0;
 let score=0; let weight=0;
 if(hasFood){
   const calorieScore = s.cal <= 0 ? 0 : s.cal <= t.calories * 1.15 ? Math.min(100, (s.cal / Math.max(t.calories * .65,1)) * 75) : Math.max(35, 100 - ((s.cal - t.calories) / Math.max(t.calories,1)) * 80);
   const proteinScore = Math.min(100, (s.p / Math.max(t.protein,1)) * 100);
   const fiberScore = Math.min(100, (s.fiber / Math.max(t.fiber,1)) * 100);
   const sugarScore = s.sugar <= t.sugar ? 100 : Math.max(20, 100 - ((s.sugar - t.sugar) / Math.max(t.sugar,1)) * 100);
   const sodiumScore = s.sodium <= t.sodium ? 100 : Math.max(25, 100 - ((s.sodium - t.sodium) / Math.max(t.sodium,1)) * 70);
   score += (calorieScore*.25 + proteinScore*.28 + fiberScore*.22 + sugarScore*.15 + sodiumScore*.10) * .75; weight += 75;
 }
 if(hasVitals){
   const waterScore = Math.min(100, ((v?.water || 0) / 8) * 100);
   const stepsScore = Math.min(100, ((v?.steps || 0) / 7000) * 100);
   let bpGlucoseScore = 100;
   if((v?.glucose||0)>180) bpGlucoseScore -= 35;
   if((v?.bpSys||0)>140 || (v?.bpDia||0)>90) bpGlucoseScore -= 30;
   score += (waterScore*.35 + stepsScore*.35 + Math.max(20,bpGlucoseScore)*.30) * .25; weight += 25;
 }
 return Math.max(0,Math.min(100,Math.round(score / Math.max(weight/100, .01))));
}
export function riskNotes(meals:MealLog[], vitals:VitalLog[], profile?:Partial<Profile>){ const t=targets(profile), s=sumMeals(meals), v=vitals[0]; const out:string[]=[]; if(s.sugar>t.sugar) out.push('Sugar is above daily awareness target. Prefer fiber/protein with next meal.'); if(s.p<t.protein*.5) out.push('Protein is low. Add dal, paneer, eggs, Greek yogurt, fish or lean chicken.'); if(v?.glucose && v.glucose>180) out.push('Glucose entry is high. Recheck, hydrate and follow your clinician plan.'); if(v?.bpSys && v.bpSys>140) out.push('BP entry is elevated. Rest and recheck; seek medical guidance if persistent.'); if(!out.length) out.push('Today looks balanced. Keep logging meals, water and movement.'); return out; }
