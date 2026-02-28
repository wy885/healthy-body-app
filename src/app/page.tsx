"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bone,
  Brain,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Wind,
} from "lucide-react";
import diseases, {
  ageCheckupSections,
  type AgeCheckupSection,
  type Disease,
  type Gender,
} from "@/data";

type LifestyleTagKey =
  | "sedentary"
  | "smoking"
  | "stress"
  | "nightOwl"
  | "skipBreakfast"
  | "heavyTaste";

const LIFESTYLE_TAGS: {
  key: LifestyleTagKey;
  label: string;
  description: string;
  mappedDiseaseTags: string[];
}[] = [
  {
    key: "sedentary",
    label: "久坐",
    description: "长时间坐着、缺乏活动",
    mappedDiseaseTags: ["久坐"],
  },
  {
    key: "smoking",
    label: "抽烟 / 吸烟",
    description: "主动或被动吸烟",
    mappedDiseaseTags: ["吸烟", "二手烟"],
  },
  {
    key: "stress",
    label: "压力大",
    description: "长期高压、情绪紧张",
    mappedDiseaseTags: ["压力大", "工作压力大", "学业压力", "精神压力大"],
  },
  {
    key: "nightOwl",
    label: "常熬夜",
    description: "入睡很晚或睡眠严重不足",
    mappedDiseaseTags: ["熬夜", "睡前玩手机", "作息不规律"],
  },
  {
    key: "skipBreakfast",
    label: "不吃早餐",
    description: "早晨经常不进食",
    mappedDiseaseTags: ["不吃早餐"],
  },
  {
    key: "heavyTaste",
    label: "重口味 / 咸",
    description: "偏好高盐、高油、高糖饮食",
    mappedDiseaseTags: ["高盐饮食", "高脂饮食", "高糖饮食", "辛辣饮食"],
  },
];

type CheckupPriority = "high" | "medium";

interface DisplayCheckupItem {
  key: string;
  title: string;
  description?: string;
  priority: CheckupPriority;
  source: "age-must" | "age-additional" | "rule";
}

function DiseaseCategoryIcon({ category }: { category: string }) {
  const base =
    "flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 ring-1 ring-slate-700/80 shadow-md shadow-slate-950/70";

  let Icon = ShieldAlert;
  if (category.includes("代谢") || category.includes("内分泌")) {
    Icon = Activity;
  } else if (category.includes("心脑血管")) {
    Icon = HeartPulse;
  } else if (category.includes("消化")) {
    Icon = Stethoscope;
  } else if (category.includes("骨骼") || category.includes("关节")) {
    Icon = Bone;
  } else if (category.includes("呼吸") || category.includes("五官")) {
    Icon = Wind;
  } else if (category.includes("神经") || category.includes("精神")) {
    Icon = Brain;
  } else if (category.includes("泌尿") || category.includes("皮肤")) {
    Icon = AlertCircle;
  }

  return (
    <span className={base} aria-hidden>
      <Icon className="h-4 w-4 text-teal-200" />
    </span>
  );
}

function findAgeSection(age: number, sections: AgeCheckupSection[]) {
  return sections.find(
    (section) => age >= section.minAge && age <= section.maxAge
  );
}

function matchDiseaseByLifestyle(
  disease: Disease,
  activeTagKeys: LifestyleTagKey[]
): boolean {
  if (activeTagKeys.length === 0) return false;

  const selectedTagValues = activeTagKeys.flatMap((key) => {
    const config = LIFESTYLE_TAGS.find((t) => t.key === key);
    return config ? config.mappedDiseaseTags : [];
  });

  return disease.tags.some((tag) => selectedTagValues.includes(tag));
}

export default function Home() {
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [selectedTags, setSelectedTags] = useState<LifestyleTagKey[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [openDiseaseId, setOpenDiseaseId] = useState<number | null>(null);

  const numericAge = useMemo(() => {
    const n = Number(age);
    return Number.isFinite(n) ? n : NaN;
  }, [age]);

  const filteredDiseases = useMemo(() => {
    if (!hasGenerated || !Number.isFinite(numericAge) || numericAge <= 0) {
      return [];
    }

    const inRange = diseases.filter(
      (d) => numericAge >= d.minAge && numericAge <= d.maxAge
    );

    // 基础：年龄 + 生活方式匹配
    const lifestyleBased = inRange.filter((disease) =>
      matchDiseaseByLifestyle(disease, selectedTags)
    );

    // 性别特异性疾病：只要年龄 + 性别匹配，就纳入（不强制要求标签）
    const genderBased =
      gender == null
        ? []
        : inRange.filter((d) => d.gender && d.gender === gender);

    const combinedMap = new Map<number, Disease>();
    lifestyleBased.forEach((d) => combinedMap.set(d.id, d));
    genderBased.forEach((d) => combinedMap.set(d.id, d));

    // 额外：针对男性，强调痛风和心血管风险
    if (gender === "male") {
      const extraMaleRiskIds = [4, 8]; // 高尿酸血症/痛风、冠心病
      extraMaleRiskIds.forEach((id) => {
        const found = inRange.find((d) => d.id === id);
        if (found) combinedMap.set(id, found);
      });
    }

    // 针对女性，强调贫血和骨质疏松风险
    if (gender === "female") {
      const extraFemaleRiskIds = [19, 31]; // 骨质疏松、缺铁性贫血（育龄女性）
      extraFemaleRiskIds.forEach((id) => {
        const found = inRange.find((d) => d.id === id);
        if (found) combinedMap.set(id, found);
      });
    }

    return Array.from(combinedMap.values());
  }, [gender, hasGenerated, numericAge, selectedTags]);

  const recommendedCheckups = useMemo<DisplayCheckupItem[]>(() => {
    if (!hasGenerated || !Number.isFinite(numericAge) || numericAge <= 0) {
      return [];
    }

    const section = findAgeSection(numericAge, ageCheckupSections);

    const items: DisplayCheckupItem[] = [];

    if (section) {
      section.mustItems.forEach((item, idx) => {
        items.push({
          key: `must-${idx}-${item.title}`,
          title: item.title,
          description: item.description,
          priority: "high",
          source: "age-must",
        });
      });

      section.additionalItems.forEach((item, idx) => {
        items.push({
          key: `add-${idx}-${item.title}`,
          title: item.title,
          description: item.description,
          priority: "medium",
          source: "age-additional",
        });
      });
    }

    // 年龄驱动：> 50 岁时，将胃肠镜和低剂量 CT 置顶并标为高优先级
    if (numericAge > 50) {
      const importantKeywords = ["胃镜", "肠镜", "低剂量螺旋 CT", "低剂量螺旋CT"];

      items.forEach((item) => {
        if (importantKeywords.some((k) => item.title.includes(k))) {
          item.priority = "high";
        }
      });

      items.sort((a, b) => {
        const aImportant = importantKeywords.some((k) =>
          a.title.includes(k)
        );
        const bImportant = importantKeywords.some((k) =>
          b.title.includes(k)
        );
        if (aImportant && !bImportant) return -1;
        if (!aImportant && bImportant) return 1;
        if (a.priority !== b.priority) {
          return a.priority === "high" ? -1 : 1;
        }
        return 0;
      });
    }

    // 标签驱动：根据生活方式追加检查项目（避免重复）
    const addRuleItem = (title: string, description: string) => {
      if (items.some((i) => i.title.includes(title))) return;
      items.push({
        key: `rule-${title}`,
        title,
        description,
        priority: "medium",
        source: "rule",
      });
    };

    if (selectedTags.includes("smoking")) {
      addRuleItem(
        "肺功能检测",
        "针对长期吸烟或被动吸烟人群，评估肺通气与换气功能，辅助判断慢性阻塞性肺疾病等风险。"
      );
    }

    if (selectedTags.includes("sedentary")) {
      addRuleItem(
        "颈椎正侧位片",
        "久坐、低头族人群可考虑拍摄颈椎正侧位片，评估颈椎曲度改变及退变情况。"
      );
    }

    if (selectedTags.includes("heavyTaste")) {
      addRuleItem(
        "24 小时尿钠检测",
        "用于评估每日盐摄入量，与高血压及心血管风险密切相关，适合重口味或高盐饮食人群。"
      );
    }

    // 性别驱动：追加性别相关体检项目
    if (gender === "female") {
      if (numericAge >= 18 && numericAge <= 35) {
        addRuleItem(
          "乳腺彩超 + 子宫及附件彩超",
          "育龄期女性建议定期进行乳腺彩超和子宫及附件彩超，筛查乳腺纤维瘤、卵巢囊肿等常见良性病变。"
        );
      } else if (numericAge >= 36 && numericAge <= 50) {
        addRuleItem(
          "TCT + HPV 联合筛查 + 乳腺影像",
          "36–50 岁女性建议定期行 TCT + HPV 宫颈癌筛查；40 岁起结合乳腺钼靶或彩超筛查乳腺病变。"
        );
      } else if (numericAge >= 50 && numericAge <= 80) {
        addRuleItem(
          "骨密度检测（绝经后重点项目）",
          "女性绝经后雌激素水平下降，骨量流失加速，建议将骨密度检测作为重点随访项目。"
        );
        // 强化已有骨密度相关项目为高优先级
        items.forEach((item) => {
          if (item.title.includes("骨密度检测")) {
            item.priority = "high";
          }
        });
      }
    } else if (gender === "male") {
      if (numericAge >= 18 && numericAge <= 40) {
        addRuleItem(
          "泌尿系统彩超 + 精索静脉曲张筛查",
          "18–40 岁男性可通过泌尿系统彩超与精索静脉曲张筛查，及早发现影响生育和泌尿健康的常见问题。"
        );
      } else if (numericAge >= 41 && numericAge <= 60) {
        addRuleItem(
          "PSA 检测 + 前列腺彩超",
          "41–60 岁男性建议定期检测 PSA 并行前列腺彩超，以筛查前列腺增生及恶性病变的早期信号。"
        );
      } else if (numericAge >= 61 && numericAge <= 80) {
        addRuleItem(
          "颈动脉斑块超声 + 心脏负荷测试",
          "高龄男性建议进行颈动脉斑块超声及心脏负荷测试，以评估心脑血管事件的综合风险。"
        );
      }
    }

    return items;
  }, [gender, hasGenerated, numericAge, selectedTags]);

  const handleToggleTag = (key: LifestyleTagKey) => {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleGenerate = () => {
    setHasGenerated(true);
  };

  const handleAccordionToggle = (id: number) => {
    setOpenDiseaseId((current) => (current === id ? null : id));
  };

  const showValidationError =
    hasGenerated && (!Number.isFinite(numericAge) || numericAge <= 0);

  const accentTextClass =
    gender === "female" ? "text-fuchsia-300/80" : "text-teal-300/80";

  const accentDotClass =
    gender === "female" ? "bg-fuchsia-300 shadow-[0_0_10px_rgba(244,114,182,0.9)]" : "bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.9)]";

  const primaryButtonGradient =
    gender === "female"
      ? "bg-gradient-to-r from-fuchsia-400 via-rose-300 to-amber-300"
      : "bg-gradient-to-r from-teal-400 via-emerald-300 to-sky-400";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-slate-50 antialiased">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-5 md:px-6 lg:px-8 lg:py-10">
        <header className="mb-7 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-center sm:text-left">
            <p
              className={[
                "text-xs font-semibold uppercase tracking-[0.25em]",
                accentTextClass,
              ].join(" ")}
            >
              HEALTHY BODY CHECKUP
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl md:text-[2rem]">
              智能体检清单生成器
            </h1>
            <p className="mt-2 mx-auto max-w-2xl text-xs text-slate-300/85 sm:text-sm">
              根据你的年龄与生活方式，智能匹配高风险疾病，并给出更有针对性的体检建议。
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 self-center rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-[11px] text-slate-200/80 shadow-lg shadow-slate-950/50 backdrop-blur sm:self-auto">
            <span className={["inline-flex h-2 w-2 rounded-full", accentDotClass].join(" ")} />
            专业健康科普，仅供参考，不能替代线下就医
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
          {/* 输入区 */}
          <section className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur sm:p-6 lg:max-w-sm">
            <h2 className="text-sm font-medium text-slate-100 sm:text-base">
              基本信息与生活方式
            </h2>
            <p className="mt-1 text-xs text-slate-300/80">
              这些信息仅用于本地计算，不会被上传。
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-200/90">
                  年龄
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="block w-full rounded-xl border border-slate-600/80 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-50 outline-none ring-0 transition focus:border-teal-300 focus:ring-2 focus:ring-teal-400/60"
                    placeholder="请输入你的年龄，例如 28"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                    岁
                  </span>
                </div>
                {showValidationError && (
                  <p className="text-xs text-rose-300/90">
                    请先输入一个合理的年龄再生成体检清单。
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-200/90">
                  性别
                </label>
                <div className="inline-flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
                      gender === "male"
                        ? "border-sky-300/90 bg-sky-400/20 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.45)]"
                        : "border-slate-600/80 bg-slate-900/80 text-slate-200 hover:border-sky-300/70 hover:bg-slate-800/90 hover:text-sky-50",
                    ].join(" ")}
                  >
                    <span className="text-[11px]">♂</span>
                    <span>男 Male</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/70",
                      gender === "female"
                        ? "border-fuchsia-300/90 bg-fuchsia-400/20 text-fuchsia-100 shadow-[0_0_18px_rgba(244,114,182,0.45)]"
                        : "border-slate-600/80 bg-slate-900/80 text-slate-200 hover:border-fuchsia-300/70 hover:bg-slate-800/90 hover:text-fuchsia-50",
                    ].join(" ")}
                  >
                    <span className="text-[11px]">♀</span>
                    <span>女 Female</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-200/90">
                  生活方式标签
                </label>
                <p className="text-[11px] text-slate-300/80">
                  勾选越贴近你当前状态的标签，推荐的潜在风险就越精准。
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LIFESTYLE_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag.key);
                    return (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={() => handleToggleTag(tag.key)}
                        className={[
                          "group rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70",
                          active
                            ? "border-teal-300/90 bg-teal-400/20 text-teal-100 shadow-[0_0_20px_rgba(45,212,191,0.45)]"
                            : "border-slate-600/80 bg-slate-900/80 text-slate-200 hover:border-teal-300/60 hover:bg-slate-800/90 hover:text-teal-50",
                        ].join(" ")}
                      >
                        <span>{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className={[
                  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_rgba(34,211,238,0.45)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
                  primaryButtonGradient,
                ].join(" ")}
              >
                生成体检清单
              </button>

              <p className="mt-2 text-[11px] text-slate-300/80">
                提示：本工具基于常见慢性病的流行病学规律进行智能匹配，不构成诊断或处方建议。
              </p>
            </div>
          </section>

          {/* 结果展示区 */}
          <section className="mt-1 flex-1 space-y-5 lg:mt-0 lg:space-y-6">
            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              {/* 左侧：必查体检项目 */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur sm:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-100 sm:text-base">
                    必查体检项目（按年龄段推荐）
                  </h2>
                  <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300">
                    年龄{gender ? " + 性别" : ""}驱动
                  </span>
                </div>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />

                {!hasGenerated || recommendedCheckups.length === 0 ? (
                  <p className="mt-4 text-xs leading-relaxed text-slate-300/80">
                    输入年龄并点击“生成体检清单”后，将根据不同年龄段自动生成一份基础必查体检项目列表。
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2.5 text-xs text-slate-100/90 sm:text-sm">
                    {recommendedCheckups.map((item) => (
                      <li
                        key={item.key}
                        className="flex gap-3 rounded-xl bg-slate-900/80 px-3 py-2 shadow-inner shadow-slate-950/60"
                      >
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.9)]" />
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="flex-1 leading-relaxed">{item.title}</p>
                            <span
                              className={[
                                "ml-2 inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                item.priority === "high"
                                  ? "bg-rose-400/20 text-rose-200 border border-rose-300/60"
                                  : "bg-amber-300/15 text-amber-200 border border-amber-200/50",
                              ].join(" ")}
                            >
                              {item.priority === "high" ? "必查 / 高优先级" : "建议 / 关注项"}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[11px] leading-relaxed text-slate-300/90">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 右侧：潜在患病风险 */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur sm:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-100 sm:text-base">
                    潜在患病风险（可展开查看详情）
                  </h2>
                  <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300">
                    年龄 + 生活方式{gender ? " + 性别" : ""}
                  </span>
                </div>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />

                {!hasGenerated ? (
                  <p className="mt-4 text-xs leading-relaxed text-slate-300/80">
                    选择与你相符的生活方式标签并生成体检清单后，将在此展示匹配的潜在疾病风险。你可以点击每一项卡片，展开查看对应的诱因、典型症状和改善方法。
                  </p>
                ) : filteredDiseases.length === 0 ? (
                  <p className="mt-4 text-xs leading-relaxed text-teal-100/90">
                    暂未匹配到明显的高风险疾病。
                    这通常是个好信号，但仍建议保持规律体检和健康生活方式。
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {filteredDiseases.map((disease) => {
                      const isOpen = openDiseaseId === disease.id;
                      return (
                        <div
                          key={disease.id}
                          className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-xl shadow-slate-950/60"
                        >
                          <button
                            type="button"
                            onClick={() => handleAccordionToggle(disease.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/80"
                          >
                            <div className="flex items-start gap-3">
                              <DiseaseCategoryIcon category={disease.category} />
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-300/80">
                                  {disease.category}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-50">
                                  {disease.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-300/80">
                                  适用年龄：{disease.minAge} - {disease.maxAge} 岁
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={[
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  disease.gender === "male"
                                    ? "bg-sky-500/15 text-sky-200 border border-sky-400/60"
                                    : disease.gender === "female"
                                    ? "bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/60"
                                    : "bg-slate-700/60 text-slate-200 border border-slate-500/70",
                                ].join(" ")}
                              >
                                {disease.gender === "male"
                                  ? "♂ 男性相关"
                                  : disease.gender === "female"
                                  ? "♀ 女性相关"
                                  : "◎ 通用风险"}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-slate-800/90 px-2 py-0.5 text-[11px] text-slate-200">
                                {matchDiseaseByLifestyle(
                                  disease,
                                  selectedTags
                                ) && (
                                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-300 shadow-[0_0_8px_rgba(248,113,113,0.9)]" />
                                )}
                                风险提示
                              </span>
                              <span
                                className={[
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 text-xs text-slate-100 transition",
                                  isOpen
                                    ? "bg-slate-800/80 rotate-90"
                                    : "bg-slate-900/80",
                                ].join(" ")}
                                aria-hidden
                              >
                                {isOpen ? "−" : "+"}
                              </span>
                            </div>
                          </button>

                          <div
                            className={`grid transform-gpu border-t border-slate-700/70 bg-slate-900/90 transition-all duration-300 ease-out ${
                              isOpen
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="min-h-0 overflow-hidden">
                              <div className="space-y-3 px-4 pb-4 pt-3 text-xs text-slate-100/90 sm:text-[13px]">
                                <div>
                                  <p className="font-medium text-teal-200">
                                    可能诱因
                                  </p>
                                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-200/90">
                                    {disease.causes.map((cause, idx) => (
                                      <li key={idx}>{cause}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <p className="font-medium text-teal-200">
                                    典型症状
                                  </p>
                                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-200/90">
                                    {disease.symptoms.map((symptom, idx) => (
                                      <li key={idx}>{symptom}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <p className="font-medium text-teal-200">
                                    生活方式改善建议
                                  </p>
                                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-200/90">
                                    {disease.improvements.map(
                                      (improvement, idx) => (
                                        <li key={idx}>{improvement}</li>
                                      )
                                    )}
                                  </ul>
                                </div>

                                <div className="mt-1 rounded-xl border border-orange-300/70 bg-orange-50/95 px-3 py-2 text-[11px] text-orange-900 shadow-sm shadow-orange-200">
                                  <div className="mb-1 flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-[11px] font-semibold">
                                      专家建议
                                    </span>
                                  </div>
                                  <p className="leading-relaxed">
                                    以上为该疾病相关的通用健康科普信息，不能替代医生面诊与正式诊断。
                                    如出现上述症状或持续不适，建议尽早前往正规医院，由相关专科医生进行评估与处理。
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </section>
        </main>

        <footer className="mt-6 border-t border-slate-800/80 pt-4 text-[11px] text-slate-400/85 sm:mt-8 sm:pt-5">
          <p>
            免责声明：本工具仅用于健康教育与自我评估参考，所有内容均不能替代专业医生的面诊、检查与诊断。如有明显不适或疑似严重症状，请及时前往正规医疗机构就诊。
          </p>
          <p className="mt-1">
            本页面不存储任何个人健康数据，所有计算仅在你的浏览器本地完成。
          </p>
        </footer>
      </div>
    </div>
  );
}

