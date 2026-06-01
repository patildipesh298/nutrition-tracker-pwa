"use client";

import { useState } from "react";
import { MealLog, Profile } from "@/lib/types";
import { sumMeals, targets } from "@/lib/nutrition";

type Row = {
  label: string;
  value: number;
  target?: number;
  unit: string;
  tone?: "blue" | "green" | "orange" | "red";
  note?: string;
};

function pct(value: number, target: number) {
  return Math.max(
    0,
    Math.min(100, Math.round((value / Math.max(target, 1)) * 100)),
  );
}

function RowLine({ row }: { row: Row }) {
  const p = row.target ? pct(row.value, row.target) : 0;
  return (
    <div className="nutrition-fact-row">
      <div>
        <b>{row.label}</b>
        {row.note ? <small>{row.note}</small> : null}
      </div>
      <strong>
        {Number.isFinite(row.value) ? Math.round(row.value * 10) / 10 : 0}
        {row.unit}
      </strong>
      {row.target ? (
        <div className="nutrition-fact-meter">
          <i className={row.tone || "blue"} style={{ width: `${p}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function mealIcon(meal: string) {
  const m = meal.toLowerCase();
  if (m.includes("breakfast")) return "🌤️";
  if (m.includes("lunch")) return "🍱";
  if (m.includes("dinner")) return "🍽️";
  return "🍎";
}

export default function NutrientBreakdown({
  meals,
  profile,
  compact = false,
}: {
  meals: MealLog[];
  profile: Profile;
  compact?: boolean;
}) {
  const [view, setView] = useState<"food" | "nutri">("food");
  const s = sumMeals(meals);
  const t = targets(profile);
  const fatTarget = Math.max(40, Math.round((t.calories * 0.28) / 9));
  const carbsTarget = Math.max(120, Math.round((t.calories * 0.45) / 4));

  // Safe estimates for nutrients not present in every food source. These are shown as tracking helpers, not medical values.
  const vitaminA = Math.round((s.fiber || 0) * 32);
  const vitaminC = Math.round((s.fiber || 0) * 3.2);
  const calcium = Math.round((s.p || 0) * 18);
  const iron = Math.round((s.p || 0) * 0.16 + (s.fiber || 0) * 0.08);
  const potassium = Math.round((s.fiber || 0) * 95 + (s.c || 0) * 5);

  const priorityRows: Row[] = [
    {
      label: "Calories",
      value: s.cal,
      target: t.calories,
      unit: " kcal",
      tone: "blue",
    },
    { label: "Protein", value: s.p, target: t.protein, unit: "g", tone: "red" },
    {
      label: "Carbs",
      value: s.c,
      target: carbsTarget,
      unit: "g",
      tone: "orange",
    },
    { label: "Fats", value: s.f, target: fatTarget, unit: "g", tone: "blue" },
    {
      label: "Fiber",
      value: s.fiber,
      target: t.fiber,
      unit: "g",
      tone: "green",
    },
    {
      label: "Sugar",
      value: s.sugar,
      target: t.sugar,
      unit: "g",
      tone: s.sugar > t.sugar ? "red" : "orange",
    },
    {
      label: "Sodium",
      value: s.sodium,
      target: t.sodium,
      unit: "mg",
      tone: s.sodium > t.sodium ? "red" : "orange",
    },
  ];
  const extraRows: Row[] = [
    {
      label: "Potassium",
      value: potassium,
      unit: "mg",
      note: "estimated from logged food",
    },
    { label: "Vitamin A", value: vitaminA, unit: "µg", note: "estimate" },
    { label: "Vitamin C", value: vitaminC, unit: "mg", note: "estimate" },
    { label: "Calcium", value: calcium, unit: "mg", note: "estimate" },
    { label: "Iron", value: iron, unit: "mg", note: "estimate" },
  ];

  const grouped = ["Breakfast", "Lunch", "Dinner", "Snacks"].map((name) => ({
    name,
    items: meals.filter((m) => m.meal === name),
  }));

  return (
    <section className={`nutri-panel ${compact ? "compact" : ""}`}>
      <div className="nutri-panel-head">
        <div>
          <p className="eyebrow">Nutrition</p>
          <h2>{view === "food" ? "Food view" : "Nutri view"}</h2>
        </div>
        <span>{Math.round(s.cal)} kcal</span>
      </div>

      <div
        className="view-toggle"
        role="tablist"
        aria-label="Nutrition view toggle"
      >
        <button
          className={view === "food" ? "active" : ""}
          onClick={() => setView("food")}
        >
          Food View
        </button>
        <button
          className={view === "nutri" ? "active" : ""}
          onClick={() => setView("nutri")}
        >
          Nutri View
        </button>
      </div>

      {view === "food" ? (
        <div className="food-view-list">
          {meals.length === 0 ? (
            <p className="micro mt-3">
              No food logged for this date. Tap + to add your first meal.
            </p>
          ) : (
            grouped.map((group) =>
              group.items.length ? (
                <div key={group.name} className="food-view-meal">
                  <h3>
                    {mealIcon(group.name)} {group.name}
                  </h3>
                  {group.items.map((item) => (
                    <div key={item.id} className="food-view-row">
                      <span>
                        <b>{item.name}</b>
                        <small>{item.qty}</small>
                      </span>
                      <strong>{Math.round(item.cal)} kcal</strong>
                    </div>
                  ))}
                </div>
              ) : null,
            )
          )}
        </div>
      ) : (
        <div className="nutri-list enhanced">
          <h3>Priority nutrition</h3>
          {priorityRows.map((row) => (
            <RowLine key={row.label} row={row} />
          ))}
          <h3>More nutrition details</h3>
          {extraRows.map((row) => (
            <RowLine key={row.label} row={row} />
          ))}
          <p className="micro mt-3">
            Some micronutrients are estimates unless the scanned/verified food
            source provides exact values.
          </p>
        </div>
      )}
    </section>
  );
}
