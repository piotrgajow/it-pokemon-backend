'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const swaggerDocument = require('./api.json');

const PORT = 8090;
const QUESTIONS_PER_QUIZ = 10;

const questions = require('./questions');
const counts = questions.reduce((acc, curr) => {
    acc.total++;
    acc.pokemon += curr.type === 0 ? 1 : 0;
    acc.it += curr.type === 1 ? 1 : 0;
    return acc;
}, {total: 0, pokemon: 0, it: 0});

logMessage(`Loaded ${counts.total} questions (${counts.pokemon} pokemons, ${counts.it} IT)`);

const quizes = {};
let id = 1;

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/status', status);
app.post('/quiz', startQuiz);
app.all('/quiz', onlyMethodAvailable('POST'));
app.get('/quiz/:quizId/question', getQuestionForQuiz);
app.all('/quiz/:quizId/question', onlyMethodAvailable('GET'));
app.post('/quiz/:quizId/answer', answerQuestionForQuiz);
app.all('/quiz/:quizId/answer', onlyMethodAvailable('POST'));
app.get('/quiz/:quizId/score', getQuizScore);
app.all('/quiz/:quizId/score', onlyMethodAvailable('GET'));
app.use(endpointNotFound);
app.listen(PORT, onServerStarted);

function onServerStarted() {
    logMessage(`Server listening on port ${PORT}`);
}

function status(request, response) {
    response.send({ status: 'Ok!' });
}

function startQuiz(request, response) {
    const quizId = id++;
    logMessage(`Started quiz ${quizId}`);
    quizes[quizId] = {
        questions: randomizeQuestions(QUESTIONS_PER_QUIZ),
        current: 0,
        points: 0,
    };
    response.send({ id: quizId, questionCount: QUESTIONS_PER_QUIZ });
}

function getQuestionForQuiz(request, response) {
    const quizId = request.params.quizId;
    const quiz = quizes[quizId];
    if (!quiz) {
        response.status(404).send({ error: `Quiz with id ${quizId} does not exist` });
        return;
    }
    const question = quiz.questions[quiz.current];
    if (question) {
        logMessage(`Returning question ${quiz.current} for quiz ${quizId}`);
        response.send({ name: question.name, done: false });
    } else {
        logMessage(`All questions in quiz ${quizId} have been already answered`);
        response.send({ name: null, done: true });
    }
}

function answerQuestionForQuiz(request, response) {
    const quizId = request.params.quizId;
    const quiz = quizes[quizId];
    if (!quiz) {
        response.status(404).send({ error: `Quiz with id ${quizId} does not exist` });
        return;
    }

    const answerJson = request.body;
    const answer = answerJson.answer;
    if (answer !== 0 && answer !== 1) {
        response.status(400).send({ error: 'Invalid answer format' });
        return;
    }

    if (quiz.current >= quiz.questions.length) {
        response.status(400).send({ error: `No questions to answer in this quiz` });
        return;
    }
    const question = quiz.questions[quiz.current];
    const details = { name: question.name, url: question.url, type: question.type };

    logMessage(`Question ${quiz.current} answered for quiz ${quizId}`);
    quiz.current++;
    if (question.type === answer) {
        quiz.points++;
        response.send({ correct: true, details });
    } else {
        response.send({ correct: false, details });
    }
}

function getQuizScore(request, response) {
    const quizId = request.params.quizId;
    const quiz = quizes[quizId];

    if (!quiz) {
        response.status(404).send({ error: `Quiz with id ${quizId} does not exist` });
        return;
    }

    response.send({ score: quiz.points });
}

function randomizeQuestions(count) {
    return questions.sort(() => 0.5 - Math.random()).slice(0, count);
}

function logMessage(message) {
    console.log(`[${new Date().toLocaleString()}] ${message}`);
}

function onlyMethodAvailable(validMethod) {
    return (request, response) => {
        response.status(404).send(`Invalid HTTP method ${request.method} for endpoint ${request.url}. Only ${validMethod} requests are allowed.`);
    }
}

function endpointNotFound(request, response) {
    response.status(404).send(`Enpoint ${request.url} does not exist`);
}
