var http = require("http"); //내장 모듈 가져오기 
var fs = require("fs");//파일 시스템 모듈

//(쪼개져서)직렬화된 전송한 데이터에 대한 해석을 담당(문자열로 해석가능함)
var qs=require("querystring"); 
var mysql=require("mysql"); //mysql 모듈 가져오기 (외부모듈이므로 별도 설치 필요)
var ejs=require("ejs"); //ejs 모듈을 가져오기 (외부모듈)

//우리가 사용할 DB접속정보
var conStr={
    url:"localhost:3306",
    database:"nodejs",
    user:"root",
    password:"1234"            
}

var server = http.createServer(function(request, response){
    //결국 서버는 클라이언트의 다양한 요청을 처리하기 위해,  요청을 구분할 수 있어야 한다..
    //결국 클라이언트가 서버에게 무엇을 원하는지에 대한 정보는 요청 URL 로 구분할 수 있다..
    //따라서 요청과 관련된 정보를 가진 객체인 request 객체를 이용하자!!
    console.log("클라이언트가 지금 요청한 주소는 ",  request.url);
    //  도메인:포트번호까지를 루트로 부르자~!! 
    /*
    회원가입 폼 요청 : /member/form
    회원가입 요청 : /member/join
    회원 목록(검색은 목록에 조건을 부여한 것임..) 요청 : /member/list
    회원 상세 보기 요청: /member/detail
    회원 정보 수정 요청: /member/edit 
    회원 정보 삭제 요청 : /member/del
    */
    switch(request.url){
        case "/member/form": registForm(request, response);break;
        case "/member/join": regist(request, response);break;
        case "/member/list": getList2(request, response);break;
        case "/member/detail": getDetail(request, response);break;
        case "/member/edit": edit(request, response);break;
        case "/member/del": del(request, response);break;
    }    
}); //서버 객체 생성 


function registForm(request, response){
    fs.readFile("./regist_form.html","utf8", function(err, data){
        //파일을 다 읽어들이면 응답 정보 구성하여 클라이언에게 전송
        response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
        response.end(data);
    });
}


function regist(request, response){
    //클라이언트가  post방식으로 전송했기 때문에 http 데이터 구성 중 body를 통해 전송되어 온다..
    //post방식의 파라미터를 끄집어 내보자!!
    //to be continue....
    //on이란 request 객체가 보유한 데이터 감지 메서드(즉 데이터가 들어왔을때..를 감지..)
    var content="";
    request.on("data", function(param){ 
        //param에는 body 안에 들어있는 데이터가 서버의 메모리 버퍼로 들어 오고, 그 데이터를 param이
        //담고 있다. 
        content+=param; //버퍼의 데이터를 모으자!!
    }); //post방식의 데이터를 감지
    
    //데이터가 모두 전송되어, 받아지면...end 이벤트 발생
    request.on("end", function(){
        console.log("전송받은 데이터는 ", content);
        console.log("파싱한 결과는", qs.parse(content));

        var obj=qs.parse(content); //파싱한 결과는 , 객체지향 개발자들이 쉽게 해석이 가능한 json으로 반환


        //이 시점이 쿼리문을 수행할 시점임!!
        // 데이터베이스에 쿼리문을 전송하기 위해서는 ,먼저 접속이 선행되어야 한다!!(당연하다)
        //접속을 시도하는 메서드의 반환값으로 , 접속 정보 객체가 반환되는데, 이 객체를 이용하여 
        //쿼리를 실행할 수 있다..우리의 경우 con 
        var con=mysql.createConnection(conStr); 
    
        //쿼리문을 실행하는 메서드명은 query() 이다 
        var sql="insert into member(user_id, user_name, user_pass)";
        sql+=" values('"+obj.user_id+"','"+obj.user_name+"','"+obj.user_pass+"')";
    
    
        con.query(sql, function(err, fields){
            if(err){ //쿼리수행중 심각한 에러 발생
                response.writeHead(500, {"Content-Type":"text/html;charset=utf-8"});
                response.end("서버측 오류 발생!!");
            }else{
                response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
                response.end("회원가입 성공<br> <a href='/member/list'>회원목록 바로가기</a>");
            }
            //db작업 성공 여부와 상관없이 연결된 접속은 끊어야 한다!!
            con.end(); //접속 끊기~!!
        }); //실행시점
    });
}

//아래의 getList()보다 더 개선된 방법으로 요청을 처리하기 위해, 함수를 별도로 정의한 것임!!
function getList2(request,response){
    //클라이언트에게 결과를 보여주기 전에, 이미 DB연동을 하여 레코드를 가져와야 한다!!
    var con=mysql.createConnection(conStr);//접속
    var sql="select*from member"
    con.query(sql,function(err, record, fields){
        //record 변수엔 json들이 일차원 배열에 탑재되어있다..
        // console.log("record is",record);
        //파일을 모두 읽으면 익명함수가 호출되고, 이 익명 함수안에 매개변수에 읽혀진 모든 데이터가
        //매개변수로 전달된다!!
        fs.readFile("./list.ejs", "utf8", function(err, data){
            if(err){
                console.log("list.ejs 을 읽는데 실패!!")
            }else{
                response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"})
                //클라리언트에게 list.ejs를 그냥 보내지 말고, 서버에서 실행을 시킨 후, 그 결과를
                //클라이언트에게 전송한다!!
                //즉, ejs를 서버에서 렌더링 시켜야 한다!!
               
                var result = ejs.render( data, {
                    members:record
                }); //퍼센트 안에 들어있는 코드가 실행되버린다!!
                response.end(result);
            }
        });
    }); //형식 , SQL문, 결과레코드,필드정보
}


//이 방법은 디자인 마저도,프로그램 코드에서 감당하고 있기 때문에, 유지보수성이 너무 낮다
//따라서, 프로그램 코드오 ㅏ디자인은 분리되어야 좋다!!
//아래의 방법은 두번다시는 사용하지 않는다 (개발규모가 커질때)
function getList(request, response){
    //회원목록 가져오기!!
    //연결된 db커넥션이 없으므로, mysql에 재접속하자
    var con=mysql.createConnection(conStr); //접속!!
    var sql="select*from member";
    //2번째 인수:select문 수행결과 배열
    //3번째 인수:컬럼에대한 메타정보(메타 데이터란? 정보자체에 대한 정보다)
    //                  여기서는 컬럼의 자료형,크기 등에 대한 정보...
    con.query(sql, function(err,result,fields){
        //console.log("쿼리문 수행후 mysql로 부터 받아온 데이터는", result);
        //result분석하기!!!
        //console.log("컬럼정보 ", fields);
        //실습: 배열을 서버의 화면에 표형태로 출력 연습해보자
        var tag="<table width='100%' border='1px'>";
        for(var i=0;i<result.length;i++){
            var member=result[i];//한 사람에 대한 정보
            var member_id=member.member_id; //pk
            var user_id=member.user_id//아이디
            var user_name=member.user_name//이름
            var user_pass=member.user_pass//비번
            var regdate=member.regdate//등록일
            tag+="<tr>";
            tag+="<td>"+member_id+"</td>"
            tag+="<td>"+user_id+"</td>"
            tag+="<td>"+user_name+"</td>"
            tag+="<td>"+user_pass+"</td>"
            tag+="<td>"+regdate+"</td>"
            tag+="<tr>";
        }
        tag+="<tr>";
        tag+="<td colspan='5'><a href='/member/form'>회원등록</a></td>";
        tag+="</tr>";
        tag+="</table>"
        response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
        response.end(tag)

        con.end();
    });

}

function getDetail(request, response){
    //한사람에 대한 정보 가져오기!!
    //mysql에 접속을 먼저해야한다!!
    var con= mysql.createConnection(conStr); //접속후 접속객체 반환!!

    //아래의 쿼리문에서 사용되는 pk값은, 클라이언트가 전송한 값으로 대체해버리자!!
    //get방식은 body를 통해 넘겨지는 post방식에 비해 header를 타고 전송되어 오므로,
    //추출하기가 용이하다!!(마치 봉투의 겉면에 씌여진 글씨와 같다!)
    console.log("url은",request.url);

    //개발자가 직접url을 문자열 분석을 시도하기 보다는 보다 url을 전문적으로
    //해석 및 분석할 수 있는 모듈에게 맡기면 된다!! 그 역할을 수행하는 모듈이 바로 querystring이다!!
    console.log("url을 분석 및 파싱한 결과는", qs.parse(request.url););

    var member_id=0; //곧 클라이언트가 넘긴 값으로 대체할 예정
    console.log("클라이언트가 전송한 member_id의 파라미터값은 ",  member_id);
    var sql="select*from member where member_id="+member_id;
    //쿼리문 수행
    con.query(sql,function(err,result,fields){
        console.log(result);
        //쿼리문이 수행 완료된 시점이므로, 이때 사용자에게 상네페이지를 보여준다
        fs.readFile("./detail.ejs", "utf8", function(err,data){
            if(err){
                console.log(err);
            }else{
                //클라이언트에게 html을 읽어서
                response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"})
                //render의 대상은 ejs 파일내의 %%퍼센트 영역만이다!!
                //따라서 모든 render작업이 끝나면 html로 재구성하여 응답정보에 실어서
                //클라이언트에게 응답을 실행한다!!
                response.end(ejs.render(data, { 
                    record:result[0] // 한건이라 할지라도, select문의 결과는 배열이다!! 따라서 0번째를 추출해서 보내자
                }));
            }
        });
    });

}

function edit(request, response){
}

function del(request, response){
}

server.listen(7979, function(){
    console.log("Server is running at 7979 port...");
});