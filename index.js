import express from "express";
import cors from "cors";
import { OpenRouter } from "@openrouter/sdk";

const app = express();
app.use(express.json());
app.use(cors());

// -------------------------------
// Initialize OpenRouter client
// -------------------------------
const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

// -------------------------------
// Model Map
// -------------------------------
const modelMap = {
    gpt35: "openai/gpt-3.5-turbo",
    mistralFree: "mistralai/devstral-2512:free",
    xiomiFree: "xiaomi/mimo-v2-flash:free",
    deepSeekFree: "tngtech/deepseek-r1t2-chimera:free",
    metaLiammaFree: "meta-llama/llama-3.3-70b-instruct:free",
    acreeFree: "arcee-ai/trinity-mini:free",
    zAiFree: "z-ai/glm-4.5-air:free",
};

// -------------------------------
// Helper: Clean option text
// -------------------------------
function cleanOption(text) {
    if (!text) return "";
    return text
        .replace(/^[A-D][).]\s*/i, "")
        .replace(/^Option\d+:\s*/i, "")
        .trim();
}

// -------------------------------
// API: Generate Questions
// -------------------------------
app.post("/api/questions", async(req, res) => {
    try {
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

        const modelToUse = model || modelMap.gpt35;

        // -------------------------------
        // Defaults
        // -------------------------------
        const finalProductGuid =
            productguid
        const finalOrgGuid =
            organizationguid
        const finalRepoGuid =
            repositoryguid

        const finalCount = count
        const finalType = type
        const finalDifficulty = difficulty

        // -------------------------------
        // PROMPT WITH DIFFICULTY
        // -------------------------------
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
        } else if (finalType === "FIBDnD") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} Fill In The Blanks Drag and Drop questions on "${topic}".

STRICT RULES:
- Use exactly one blank
- Represent blank as @^^{Blank 1}^^@
- Do NOT number questions
- Do NOT add explanations
- Output plain text only

FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumber

Example:
Water freezes at @^^{Blank 1}^^@ degrees | 0 | 10 | 50 | 100 | 1
`;
        } else if (finalType === "FIBDD") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} Fill In The Blanks Dropdown questions on "${topic}".

STRICT RULES:
- Use exactly one blank
- Represent blank as @^^{Blank 1}^^@
- Do NOT number questions
- Do NOT add explanations
- Output plain text only

FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumber

Example:
@^^{Blank 1}^^@ is the capital of France | London | Berlin | Madrid | Paris | 4
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

        // -------------------------------
        // Call OpenRouter
        // -------------------------------
        const completion = await openRouter.chat.send({
            model: modelToUse,
            messages: [{ role: "user", content: prompt }],
            stream: false,
        });

        const text = completion.choices[0].message.content;

        console.log("\nRAW AI OUTPUT:\n", text);

        // -------------------------------
        // Parse Output
        // -------------------------------
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
            } else if (finalType === "FIBDnD") {
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
            } else if (finalType === "FIBDD") {
                const [q, o1, o2, o3, o4, corr] = parts;

                questionText = q;
                correct = [Number(corr)];

                choices = [{
                        optionid: 1,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o1),
                    },
                    {
                        optionid: 2,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o2),
                    },
                    {
                        optionid: 3,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o3),
                    },
                    {
                        optionid: 4,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o4),
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

            if (finalType === "FIBDnD") {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        questioncode: `ES-FIBDnD-${index + 1}`,
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: "FIBDnD",
                        repositoryguid: finalRepoGuid,
                        questionlevelid: finalDifficulty === "Easy" ? 1 : finalDifficulty === "Medium" ? 2 : 3,
                        maxscore: 0,
                        answeringtime: 0,
                        classification: "None",
                        metadata: [],
                        feedback: {
                            isquestionfeedback: false,
                            ischoicefeedback: false,
                        },
                        language: "English",

                        data: {
                            blanks: [{
                                blankid: 1,
                                blankguid: "00000000-0000-0000-0000-000000000000",
                            }, ],
                            options: choices,
                            preferences: {
                                shuffle: true,
                                ishorizontalalignment: true,
                            },
                        },

                        answers: [{
                            blankid: 1,
                            options: choices.map((c) => ({
                                optionid: c.choiceid,
                                score: correct.includes(c.choiceid) ? 2 : 0,
                                iscorrect: correct.includes(c.choiceid),
                                negativescore: 0,
                            })),
                        }, ],

                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            }
            if (finalType === "FIBDD") {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        repositoryguid: finalRepoGuid,
                        questioncode: "",
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: "FIBDD",
                        questionlevelid: finalDifficulty === "Easy" ?
                            1 : finalDifficulty === "Medium" ?
                            2 : 3,
                        answeringtime: 0,
                        classification: "None",
                        language: "English",
                        metadata: [],
                        feedback: {
                            isquestionfeedback: false,
                            ischoicefeedback: false,
                        },

                        data: {
                            blanks: [{
                                blankid: 1,
                                blankguid: "00000000-0000-0000-0000-000000000000",
                                options: choices,
                            }, ],
                            preferences: {
                                ishorizontalalignment: true,
                                shuffle: true,
                            },
                        },

                        answers: [{
                            blankid: 1,
                            options: choices.map((o) => ({
                                optionid: o.optionid,
                                score: correct.includes(o.optionid) ? 2 : 0,
                                iscorrect: correct.includes(o.optionid),
                            })),
                        }, ],

                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            }

            return {
                productguid: finalProductGuid,
                organizationguid: finalOrgGuid,
                assetguids: [],
                question: {
                    repositoryguid: finalRepoGuid,
                    questionguid: "00000000-0000-0000-0000-000000000000",
                    questioncode: `NSE-Item-${finalType}-${index + 1 + 100}`,
                    questiontext: `<p>${questionText}</p>`,
                    questiontype: finalType,
                    questionlevel: finalDifficulty,
                    questionlevelid: finalDifficulty === "Easy" ?
                        1 : finalDifficulty === "Medium" ?
                        2 : 3,
                    answeringtime: 0,
                    classification: "None",
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

// -------------------------------
app.listen(5000, () =>
    console.log("✅ OpenRouter AI server running on port 5000"),
);