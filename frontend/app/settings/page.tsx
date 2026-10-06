"use client";
import { useStore } from "@/lib/store";
import { Icon, Seg, TabBar } from "@/components/ui";

export default function SettingsPage() {
  const { t, lang, setLang, unit, setUnit, preds, clearHistory, toast } = useStore();
  return (
    <section className="view active" aria-label="Settings">
      <div className="scroll">
        <div className="hdr" style={{ marginLeft: 0 }}><h1>{t("settings")}</h1></div>
        <div className="setting">
          <div className="label"><Icon name="globe" size={20} /><span>{t("language")}</span></div>
          <Seg options={[["en", "English"], ["ny", "Chichewa (draft)"]]} value={lang} onChange={setLang} label={t("language")} />
          <p className="help" style={{ marginTop: 8 }}>{t("langNote")}</p>
        </div>
        <div className="setting">
          <div className="label"><Icon name="ruler" size={20} /><span>{t("areaUnit")}</span></div>
          <Seg options={[["ha", "Hectares"], ["acre", "Acres"]]} value={unit} onChange={setUnit} label={t("areaUnit")} />
        </div>
        <div className="setting">
          <button className="btn btn-outline" onClick={() => {
            if (!preds.length) return toast("History is already empty.");
            if (confirm("Delete all saved estimates?")) { clearHistory(); toast("History cleared."); }
          }}><Icon name="trash" size={20} /><span>{t("clearHistory")}</span></button>
        </div>
      </div>
      <TabBar active="settings" />
    </section>
  );
}
