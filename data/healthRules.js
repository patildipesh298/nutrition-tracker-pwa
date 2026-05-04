window.HEALTH_RULES = {
  markers: {
    hbA1c: {label:'HbA1c', unit:'%', low:null, high:5.7, review:6.5, note:'Long-term blood sugar marker.'},
    fastingGlucose: {label:'Fasting glucose', unit:'mg/dL', low:70, high:100, review:126, note:'Morning sugar before food.'},
    systolic: {label:'Systolic BP', unit:'mmHg', low:90, high:120, review:140, note:'Top BP number.'},
    diastolic: {label:'Diastolic BP', unit:'mmHg', low:60, high:80, review:90, note:'Bottom BP number.'},
    ldl: {label:'LDL cholesterol', unit:'mg/dL', low:null, high:100, review:160, note:'Lower is usually better; goal varies by risk.'},
    hdl: {label:'HDL cholesterol', unit:'mg/dL', low:40, high:null, review:null, note:'Higher is usually better.'},
    triglycerides: {label:'Triglycerides', unit:'mg/dL', low:null, high:150, review:200, note:'Blood fat marker.'},
    creatinine: {label:'Creatinine', unit:'mg/dL', low:0.6, high:1.3, review:1.5, note:'Kidney-related marker; ranges vary.'},
    egfr: {label:'eGFR', unit:'mL/min', low:60, high:null, review:45, note:'Kidney filtration estimate.'},
    tsh: {label:'TSH', unit:'mIU/L', low:0.4, high:4.0, review:5.0, note:'Thyroid marker; lab ranges vary.'},
    vitaminD: {label:'Vitamin D', unit:'ng/mL', low:30, high:100, review:20, note:'Low values are common; supplementation should be clinician guided.'},
    b12: {label:'Vitamin B12', unit:'pg/mL', low:300, high:900, review:200, note:'Important for nerves and blood.'},
    hemoglobin: {label:'Hemoglobin', unit:'g/dL', low:12, high:17.5, review:10, note:'Low can suggest anemia; ranges differ by sex.'}
  },
  dietByCondition: {
    diabetes: ['Prioritize high-fiber carbs: dal, beans, vegetables, millet/roti portions.', 'Avoid sugary drinks and large refined-carb meals.', 'Consider a 10–15 minute gentle walk after meals if safe.'],
    hypertension: ['Keep sodium lower: limit salty snacks, pickles, papad, packaged foods.', 'Add potassium-rich foods if kidney function is normal: fruits/vegetables/dal.', 'Track BP regularly and share trend with doctor.'],
    kidney: ['Do not increase protein/potassium without clinician approval.', 'Track creatinine/eGFR and ask doctor about fluid/protein limits.', 'Avoid random supplements.'],
    cholesterol: ['Increase soluble fiber: oats, beans, fruits, vegetables.', 'Use nuts in small portions; reduce fried foods and excess ghee/butter.', 'Prefer grilled/steamed foods.'],
    arthritis: ['Gentle mobility, stretching, and anti-inflammatory foods may help.', 'Avoid painful exercises; prefer low-impact movement.', 'Track pain score daily.']
  },
  redFlags: ['Chest pain', 'Severe breathlessness', 'Fainting', 'Confusion', 'Very high BP like 180/120', 'Very low or very high sugar with symptoms']
};
