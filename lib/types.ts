export type Profile = { name:string; age:number; gender:string; height:number; weight:number; activity:number; goal:string; diet:string; cuisine:string; conditions:string[]; allergies:string; medicines:string; emergency:string; doctorNotes:string };
export type MealLog = { id:string; date:string; meal:string; name:string; qty:string; cal:number; p:number; c:number; f:number; fiber:number; sugar:number; sodium:number; potassium?:number; calcium?:number; iron?:number; vitaminA?:number; vitaminC?:number; source?:string };
export type VitalLog = { id:string; date:string; bpSys:number; bpDia:number; glucose:number; pulse:number; water:number; steps:number; symptoms:string };
export type LabLog = { id:string; date:string; hbA1c?:number; fastingGlucose?:number; cholesterol?:number; vitaminD?:number; notes?:string };
export type ExerciseLog = { id:string; date:string; name:string; minutes:number; effort:string; calories:number };
