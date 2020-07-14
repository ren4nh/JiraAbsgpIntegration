const axios = require("axios").default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const moment = require('moment');
require("dotenv/config");

axiosCookieJarSupport(axios);

const cookieJar = new tough.CookieJar();

async function getWorklog() {
    payload = {
        from: process.env.INITIAL_DATE,
        to: process.env.FINAL_DATE
    }

    return await axios.post(process.env.JIRA_URL, payload,{
         auth: {username: process.env.JIRA_USERNAME, password: process.env.JIRA_PASSWORD}
        });
}

async function loginAbsgp(data) {
    const resp = await axios.post(process.env.ABSGP_LOGIN_URL,
         `email=${encodeURIComponent(process.env.ABSGP_USERNAME)}&password=${encodeURIComponent(process.env.ABSGP_PASSWORD)}`,
         {headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, jar: cookieJar, withCredentials: true} )
    if(resp.request.path == '/') {
        return Promise.resolve(data);
    }
    return Promise.reject("Erro ao fazer o login, verifique seu usuário e senha")
}

async function organizeData(data) {
    const dados = data.map(worklogs => {
        let scheduleId = 8150;
        if(worklogs.issue.key == 'DOON-1089') {
            scheduleId = 8154;
        } else if (worklogs.issue.key.startsWith('DOON')) {
            scheduleId = 8154
        }
        const date = moment(worklogs.started)
        const final_time = moment(worklogs.started).add(worklogs.timeSpentSeconds, 's').format("HH:mm");
        return {
            scheduleId,
            date : date.format("YYYY-MM-DD"),
            percentage: 10,
            initial_time: date.format("HH:mm"),
            final_time
        }
    });

    return Promise.resolve(dados);
}

async function addWorklog(worklogs) {
    let total = 0;
    await worklogs.forEach(worklog => {
        axios.post(process.env.ABSGP_WORKLOG_URL,worklog,{ jar: cookieJar, withCredentials: true}).then(resp => total += 1).catch(error => {console.log(error);
        Promise.reject("Erro ao fazer o login, verifique seu usuário e senha")})
    })
    return Promise.resolve(`Importados ${total} registros`)
}



getWorklog()
.then(response => organizeData(response.data))
.then(data => loginAbsgp(data))
.then(worklogs => addWorklog(worklogs))
.then(data => console.log(data))
.catch(error => console.log(error));

