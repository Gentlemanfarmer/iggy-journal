# Iggy Journal — Fix-Plan

Abarbeiten von oben nach unten. Reihenfolge = **Risiko zuerst, dann Fundament, dann Feinschliff**.
Ein Branch pro Punkt (`fix/rls-weightchart`, `fix/tz-helper`, …), klein committen, abhaken.

**Prinzip:**
1. Erst *verifizieren* (nichts ändern) — evtl. ist ein 🔴-Punkt schon erledigt.
2. Sicherheit vor Korrektheit vor Modell vor UX/UI.
3. Fundament-Refactors (Timezone-Helper, toter Code) früh, weil sie spätere Punkte vereinfachen.
4. Inhalt (Wissens-DB) kann jederzeit parallel laufen — risikolos.

---

## Phase 0 — Verifizieren & Sicherheitsnetz  *(kein Feature-Code)*
- [ ] Dev-Server + `build` laufen sauber, App einmal manuell durchklicken (Baseline).
- [ ] **RLS-Status prüfen** (Supabase → SQL Editor):
  ```sql
  select tablename, policyname, cmd, qual
  from pg_policies
  where schemaname = 'public'
  order by tablename, cmd;
  select relname, relrowsecurity
  from pg_class
  where relname in
    ('entries','user_rules','rule_dependencies',
     'food_products','feeding_components','audit_logs');
  ```
  → Ist `relrowsecurity = true` überall **und** existiert je Tabelle eine Policy mit `user_id = auth.uid()` für select/insert/update/delete?
- [ ] Ergebnis hier notieren → entscheidet, ob Phase 1.1 „nur absichern" oder „dringend reparieren" ist.

## Phase 1 — Sicherheit 🔴
- [ ] **1.1 RLS vervollständigen** (falls Phase 0 Lücken zeigt) — fehlende Policies ergänzen.
- [ ] **1.2 WeightChart** `user_id`-Filter nachrüsten (Z. ~3067) — Defense-in-Depth.
- [ ] **1.3 Foto-Bucket privat** + `createSignedUrl`:
  - Bucket auf privat stellen, bestehende Dateien migrieren.
  - Upload-Stellen bleiben; alle `getPublicUrl` → signierte URLs (async!).
  - Betroffen: JournalView, IncidentView, FoodLibrary, FeedingPlan `<img src>`.
  - *Größter „kleiner" Punkt — eigener Branch, in Ruhe testen.*

## Phase 2 — Fundament & Korrektheit-Quickwins 🟠  *(klein, isoliert, testbar)*
- [x] **2.1 `todayLocal()`-Helper** in `lib/dates.js`, dann ersetzen in:
      QuickAdd, QuickEntryModal, FoodLibrary (inventory_date), ExportData.
- [x] **2.2 `highlightText`** (KnowledgeBase): Suchterm escapen **und** `/g`+`.test()`-Bug fixen.
- [x] **2.3 Gewicht-Validierung:** `value` bei Kategorie „Gewicht" Pflicht; im Chart `NaN` filtern.
- [x] **2.4 Toten Code entfernen:** ~~`useQueryCache.js`~~ (aktiv in JournalView) + `calculateDailyTotal` entfernt.

## Phase 3 — Datenmodell & Performance 🟠
- [ ] **3.1 DueOverview N+1** → ein Query über alle `(category, subtype)`, im Client gruppieren.
- [ ] **3.2 Vorratsmodell / Einheiten:** gemischte g ↔ TL/EL pro Produkt verhindern oder kennzeichnen.
- [ ] **3.3 Init-Regeln** an Login/DB-Trigger hängen statt nur an RulesEditor-Mount.

## Phase 4 — Inhalt / Fachlich 🟠🟡  *(risikolos, jederzeit)*
- [ ] **4.1** Entwurmungs-Intervall welpengerecht (nicht 90 Tage im 1. Halbjahr).
- [ ] **4.2** `[Einzutragen]`-Platzhalter füllen (Futter, Medizin) oder ausblenden.
- [ ] **4.3** „Ohrenpflege" von Training → Pflege/Medizin umsortieren.
- [ ] **4.4** (optional) Modul „Genetik/Erbgesundheit" (LGT1, NAD, Speicherkrankheit, HD).
- [ ] **4.5** (Entscheidung) „Schnauzgriff" vs. eigene PR-Philosophie.

## Phase 5 — UX / UI 🟡🟢
- [ ] **5.1** Kontrast: `text-teal/40` bei 10 px anheben; Fokus-Styles an Buttons.
- [ ] **5.2** `aria-label` an Icon-Buttons (✎ ✕ ✓ 🔗 …).
- [ ] **5.3** QuickAdd „Speichern & weiter"; Gewicht-Shortcut (Subtyp-Skip).
- [ ] **5.4** Löschen: optimistisch + Undo-Toast statt `confirm()`.
- [ ] **5.5** KB-Suche modulübergreifend.
- [ ] **5.6** Kleinigkeiten: Toast-`id` als Counter/UUID, `animate-pulse` weg, Modal `w-full max-w-96`.

## Phase 6 — Optional / später 🟢
- [ ] PWA-Manifest + Offline-Queue (loggen ohne Netz).
- [ ] Refactor `useEntryForm`-Hook gegen QuickAdd/QuickEntryModal-Duplikation.
- [ ] Zentrales `user` aus Context statt `getSession()` in jedem Handler.

---

### Fortschritt
- Phase 0: ⬜ · Phase 1: ⬜ · Phase 2: ⬜ · Phase 3: ⬜ · Phase 4: ⬜ · Phase 5: ⬜
