const express = require("express");
const cors = require("cors");
const { OpenRouter } = require("@openrouter/sdk");

const app = express();

/* ---------------------------------------------------
   CORS (VERY IMPORTANT FOR VERCEL)
--------------------------------------------------- */
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// Preflight support
app.options("*", cors());

app.use(express.json());

/* ---------------------------------------------------
   OpenRouter Client
--------------------------------------------------- */
const openRouter = new OpenRouter({
    apiKey: "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",
});

/* ---------------------------------------------------
   Model Map
--------------------------------------------------- */
const modelMap = {
    gpt35: "openai/gpt-3.5-turbo",
    mistralFree: "mistralai/devstral-2512:free",
    xiomiFree: "xiaomi/mimo-v2-flash:free",
    deepSeekFree: "tngtech/deepseek-r1t2-chimera:free",
    metaLiammaFree: "meta-llama/llama-3.3-70b-instruct:free",
    acreeFree: "arcee-ai/trinity-mini:free",
    zAiFree: "z-ai/glm-4.5-air:free",
};

/* ---------------------------------------------------
   Helper
--------------------------------------------------- */
function cleanOption(text) {
    if (!text) return "";
    return text
        .replace(/^[A-D][).]\s*/i, "")
        .replace(/^Option\d+:\s*/i, "")
        .trim();
}

/* ---------------------------------------------------
   API: Generate Questions
--------------------------------------------------- */
app.post("/api/questions", async(req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Origin", "*");

        const {
            topic,
            productguid,
            organizationguid,
            repositoryguid,
            type,
            count,
            model,
            difficulty,
        } = req.body;

        if (!topic) {
            return res.status(400).json({ error: "Topic is required" });
        }

        const modelToUse = modelMap[model] || modelMap.gpt35;

        /* ---------------- Defaults ---------------- */
        const finalProductGuid =
            productguid;

        const finalOrgGuid =
            organizationguid;

        const finalRepoGuid =
            repositoryguid;

        const finalCount = count || 5;
        const finalType = type || "MCQ";
        const finalDifficulty = difficulty || "Medium";

        /* ---------------- Prompt ---------------- */
        let prompt = "";

        if (finalType === "TF") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty true/false questions on "${topic}".

STRICT RULES:
- Only use True and False
- No explanations
- No numbering
- No extra text

FORMAT ONLY:
Question | True | False | CorrectOptionNumber

CorrectOptionNumber must be 1 or 2
`;
        } else if (finalType === "MRQ") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty multiple-response questions on "${topic}".

VERY IMPORTANT RULES:
- Do NOT use A), B), C), D)
- Do NOT write Answer or explanation
- Do NOT number questions
- Do NOT repeat questions
- Output plain text only

STRICT FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumbers

CorrectOptionNumbers MUST be comma-separated values (e.g., 1,3 or 2,4)

Example:
Which of the following are programming languages? | Python | HTML | Java | CSS | 1,3
`;
        } else {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty multiple-choice questions on "${topic}".

VERY IMPORTANT RULES:
- Do NOT use A), B), C), D)
- Do NOT write Answer or explanation
- Do NOT number questions
- Do NOT repeat questions
- Output plain text only

STRICT FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumber

CorrectOptionNumber MUST be 1, 2, 3, or 4

Example:
Which organelle produces ATP? | Nucleus | Mitochondria | Golgi apparatus | Ribosome | 2
`;
        }

        /* ---------------- OpenRouter Call ---------------- */
        const completion = await openRouter.chat.send({
            model: modelToUse,
            messages: [{ role: "user", content: prompt }],
            stream: false,
        });

        const text = completion.choices[0].message.content;

        /* ---------------- Parse ---------------- */
        const lines = text
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.includes("|"));

        const questions = lines.map((line, index) => {
            const parts = line.split("|").map((p) => p.trim());

            let questionText, correct;
            let choices = [];

            if (finalType === "TF") {
                const [q, opt1, opt2, corr] = parts;
                questionText = q;
                correct = [Number(corr)];
                choices = [{
                        choiceid: 1,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 1,
                        choicetext: opt1,
                    },
                    {
                        choiceid: 2,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 2,
                        choicetext: opt2,
                    },
                ];
            } else if (finalType === "MRQ") {
                const [q, o1, o2, o3, o4, corr] = parts;
                questionText = q;
                correct = corr.split(",").map((n) => Number(n.trim())); // multiple answers
                choices = [{
                        choiceid: 1,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 1,
                        choicetext: cleanOption(o1),
                    },
                    {
                        choiceid: 2,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 2,
                        choicetext: cleanOption(o2),
                    },
                    {
                        choiceid: 3,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 3,
                        choicetext: cleanOption(o3),
                    },
                    {
                        choiceid: 4,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 4,
                        choicetext: cleanOption(o4),
                    },
                ];
            } else {
                const [q, o1, o2, o3, o4, corr] = parts;
                questionText = q;
                correct = [Number(corr)];
                choices = [{
                        choiceid: 1,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 1,
                        choicetext: cleanOption(o1),
                    },
                    {
                        choiceid: 2,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 2,
                        choicetext: cleanOption(o2),
                    },
                    {
                        choiceid: 3,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 3,
                        choicetext: cleanOption(o3),
                    },
                    {
                        choiceid: 4,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 4,
                        choicetext: cleanOption(o4),
                    },
                ];
            }

            return {
                productguid: finalProductGuid,
                organizationguid: finalOrgGuid,
                assetguids: [],
                question: {
                    repositoryguid: finalRepoGuid,
                    questionguid: "00000000-0000-0000-0000-000000000000",
                    questioncode: `NSE-Item-${finalType}-${index + 101}`,
                    questiontext: `<p>${questionText}</p>`,
                    questiontype: finalType,
                    questionlevel: finalDifficulty,
                    questionlevelid: finalDifficulty === "Easy" ? 1 : finalDifficulty === "Medium" ? 2 : 3,
                    language: "English",
                    metadata: [],
                    feedback: { isquestionfeedback: false, ischoicefeedback: false },
                    data: {
                        choices,
                        preferences: {
                            ishorizontalalignment: true,
                            shuffle: finalType !== "TF",
                            minchoices: finalType === "MRQ" ? 2 : undefined,
                            maxchoices: finalType === "MRQ" ? 3 : undefined,
                        },
                    },
                    answers: choices.map((c) => ({
                        choiceid: c.choiceid,
                        score: correct.includes(c.choiceid) ? 2 : 0,
                        iscorrect: correct.includes(c.choiceid),
                    })),
                    hints: { hint1: "", hint2: "", hint3: "" },
                    passageid: null,
                },
            };
        });

        res.json({ questions });
    } catch (error) {
        console.error("OpenRouter AI ERROR:", error.message);
        res.status(500).json({ error: "AI generation failed" });
    }
});


app.get("/", (req, res) => {
    res.send("API running");
});
/* ---------------------------------------------------
   EXPORT (NO app.listen FOR VERCEL)
--------------------------------------------------- */
module.exports = app;