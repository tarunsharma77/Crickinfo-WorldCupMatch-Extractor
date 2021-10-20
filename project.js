
let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");  // jsdom will load the html and prepare dom for programmer just like a browser would have
let fs = require("fs");
let excel = require("excel4node");
let path = require("path");
let pdf = require("pdf-lib");

// node practice.js --FolderName=WorldCupdata --dest=WorldCup.csv --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results"


let args = minimist(process.argv);

let responsekaPromise = axios.get(args.source);
responsekaPromise.then(function(response){
    let html = response.data;

    let dom = new jsdom.JSDOM(html);  // html ka tree like structure de rha hai 
    let document = dom.window.document; //  browser wali functionality mil jati hai lakin hame sir document se matlab hai
    

    let matcheInfoDiv = document.querySelectorAll("div.match-score-block");
    // console.log(matcheInfoDiv);


    let matches = [];
    for(let i= 0; i<matcheInfoDiv.length; i++){
        let match = {

        };
         
        let teamName = matcheInfoDiv[i].querySelectorAll("div.name-detail > p.name");
        match.t1 = teamName[0].textContent; 
        match.t2 = teamName[1].textContent; 
        
        
        let spanScore = matcheInfoDiv[i].querySelectorAll("span.score");
        if(spanScore.length == 0){
            match.t1s = " ";
            match.t2s = " ";

        }else if(spanScore.length == 1){
            match.t1s = spanScore[0].textContent;
            match.t2s = " ";

        }else{
            match.t1s = spanScore[0].textContent;
            match.t2s = spanScore[1].textContent;
        }

        let spanResult = matcheInfoDiv[i].querySelector('div.status-text > span');
        match.result = spanResult.textContent;
        
        matches.push(match);
    }
    teams = [];
    for(let i = 0; i < matches.length; i++){
        // let match = matches[i];
        putTeamInTeamsArrayIfMissing(teams,matches[i]);
    }


    for(let i = 0; i < matches.length; i++){
        putMatchInAppropriateTeam(teams, matches[i]);
    }

    let teamsjson = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsjson, "utf-8");
    createExcel(teams);



    fs.mkdirSync(args.FolderName)  // used to create worldcup folder
    for(let i =0; i<teams.length; i++){
    let teamsFolder = path.join(args.FolderName, teams[i].name);     //  worldcup\teamName
    fs.mkdirSync(teamsFolder, { recursive: true });   // create teamName folder in worldcup folder  

    for(let j = 0; j<teams[i].matches.length; j++){
        let matchFilename = path.join(teamsFolder, teams[i].matches[j].vs + ".pdf");  // path created for every opponent team in team[i] folder
        createscorecard(teams[i].name, teams[i].matches[j], matchFilename);
    }

}



    // console.log(json);
    // console.log(teams.length);
}).catch(function(err){
    console.log(err);
});



function putTeamInTeamsArrayIfMissing(teams,match){   // ye function matches.length time call ho rha hai (48*)
    let t1idx = -1;
    for(let i =0; i <teams.length; i++){
        if(teams[i].name == match.t1){
            t1idx = i;
            break;
        }
    }

    if(t1idx == -1){
        let team1 = {
            name : match.t1,
            matches : []
        }
        teams.push(team1);
    }

    let t2idx = -1;
    for(let i = 0; i<teams.length; i++){
        if(teams[i].name == match.t2){
            t2idx = i;
            break;
        }
    }
    
    if(t2idx == -1){
        let team2 = {
            name : match.t2,
            matches: []
        }
        teams.push(team2);
    }
    
}

function putMatchInAppropriateTeam(teams, match){  // ye function matches.length time call ho rha hai (48*)
    let t1idx = -1;
    for(let i = 0; i<teams.length; i++){  // teams.length = 10
        if(teams[i].name == match.t1){   
            t1idx = i;
            break;
        }
    }
    
    let team1 = teams[t1idx];
    team1.matches.push({
        vs : match.t2,
        selfScore : match.t1s,
        oppoScore : match.t2s,
        result : match.result
    });

    // 1 match ki detail 2 jagha fill ho gi kyo ki her team ka alag folder hai
    let t2idx = -1;
    for(let i = 0; i< teams.length; i++){  // teams.length = 10
        if(teams[i].name == match.t2){   
            t2idx = i;
            break;
        }
    }
    
    let team2 = teams[t2idx];
    team2.matches.push({
        vs : match.t1,
        selfScore : match.t2s,
        oppoScore : match.t1s,
        result : match.result
    });

}

function createExcel(teams){// function to create excel
    let wb = new excel.Workbook();
    for(let i = 0; i< teams.length; i++){
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1,1).string("VS");
        sheet.cell(1,2).string("self_Score");
        sheet.cell(1,3).string("Opponent_Score");
        sheet.cell(1,4).string("Result");

        for(let j = 0; j<teams[i].matches.length; j++){
            sheet.cell(j+2, 1).string(teams[i].matches[j].vs);
            sheet.cell(j+2, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(j+2, 3).string(teams[i].matches[j].oppoScore);
            sheet.cell(j+2, 4).string(teams[i].matches[j].result);
            // sheet.cell(j+2, 1).string(teams[i].matches[j].vs);
        }
    }
    wb.write(args.dest);
}

function createscorecard(teamName, match, matchFileName){  
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppoScore;
    let result = match.result;

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 360,
            y: 610,
            size: 14
        });
        page.drawText(t2, {
            x: 360,
            y: 574,
            size: 14
        });
        page.drawText(t1s, {
            x: 360,
            y: 541,
            size: 14
        });
        page.drawText(t2s, {
            x: 360,
            y: 513,
            size: 14
        });
        page.drawText(result, {
            x: 360,
            y: 485,
            size: 14
        });

        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
          
            fs.writeFileSync(matchFileName, finalPDFBytes);
        })
    })

      
}