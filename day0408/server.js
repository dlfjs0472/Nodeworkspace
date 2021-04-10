var http=require("http"); //기본 내부모듈

//클라이언트가 업로드 한 바이너리 데이터 처리를 위한 모듈
var multer=require("multer"); //외부모듈(설치필요)-->cmd 에서 설치경로설정후 npm install multer
// var oracledb=require("oracledb")//외부모듈(설치필요) -->   npm install oracledb
var mysql=require("mysql")//외부모듈(설치필요) -->  npm install mysql
var mymodule=require("./lib/mymodule.js");
var ejs=require("ejs");//외부모듈(설치필요) --> npm install ejs
var fs=require("fs");
var path=require("path");//파일의 경로와 관련되어 유용한 기능을 보유한 모듈, 확장자를 추출하는 기능포함
var express=require("express"); //express모듈 가져오기 외부모듈(설치필요) --> npm install express


var app=express();//express 객체생성

//필요한 각종 미들웨어 적용 
// app.use(express.static("정적자원의 루트경로")); //use는 미들웨어 적용함수,static을 정적자원적용 루트로 사용
app.use(express.static(__dirname+"/static")); //__dirname은 현재파일의 경로


//업로드 모듈을 이용한 업로드 처리 destination:저장할 곳, filename:저장할이름
//노드js뿐만 아니라, asp,php,jsp 등등은 일단 업로드 컴포넌트를 사용할 경우
//모든 post는 이 업로드 컴포넌트를 통해 처리된다..
var upload = multer({
    storage: multer.diskStorage({
        destination:function(request, file, cb){
            cb(null, __dirname+"/static/upload");
        },
        filename:function(request, file, cb){
            console.log("file is ", file);
            //업로드한 파일에 따라서 파일 확장자는 틀려진다..프로그래밍적으로 정보를 추출해야 한다!!
            // cb(null, new Date().valueOf()+path.extname("대상파일명"));
            // path.extname(file.originalname) 의 결과는 jpg,png...
            console.log("업로드된 파일 확장자는",path.extname(file.originalname));
            cb(null, new Date().valueOf()+path.extname(file.originalname));
        }
    })    
});

//mysql 접속 정보 
var conStr={
    url:"localhost:3306",
    user:"root",
    password:"1234",
    database:"nodejs"
};

//글목록 요청 처리
app.get("/gallery/list", function(request, response){
    var con=mysql.createConnection(conStr); //접속

    var sql="select * from gallery order by gallery_id desc"; //내림차순
    con.query(sql, function(err,result,fields){
        if(err){
            console.log(err)
        }else{
            //ejs 렌더링..
            fs.readFile("./gallery/list.ejs", "utf8", function(error,data){
                if(error){
                    console.log(error);
                }else{
                    response.writeHead(200,{"Content-Type":"text/html; charset=utf-8"})
                    response.end(ejs.render(data,{
                        galleryList:result,
                        lib:mymodule
                    }));//ejs 렌더링해서 넣기
                }
            });
        }
        con.end();//서버접속해제
    }); 
    
});


//글 등록 요청 처리
app.post("/gallery/regist", upload.single("pic"),  function(request,response){//post방식
    //파라미터받기
    var title=request.body.title;
    var writer=request.body.writer;
    var content=request.body.content
    var filename=request.file.filename;//multer를 이용했기 때문에 기존의 request객체에 추가된것임
    console.log("filename 는", filename);
    
    
    //mysql에 접속
    var con=mysql.createConnection(conStr)
    var sql="insert into gallery(title,writer,content,filename) values(?,?,?,?)"
    con.query(sql, [title,writer,content,filename], function(error,fields){
        if(error){
            console.log(error)
        }else{
            response.writeHead(200,{"Content-Type":"text/html; charset=utf-8"})
            response.end(mymodule.getMsgUrl("등록완료", "/gallery/list"));
        }
        con.end(); //mysql 접속 해제
    });

});


//상세보기 요청
app.get("/gallery/detail", function(request,response){
    var con=mysql.createConnection(conStr);
    var gallery_id=request.query.gallery_id;
    var sql="select * from gallery where gallery_id="+gallery_id;

    //쿼리문 수행
    con.query(sql, function(err, result, fields){
        if(err){
            console.log(err);
        }else{
            //상세 페이지 보여주기
            fs.readFile("./gallery/detail.ejs", "utf8", function(error,data){
                if(error){
                    console.log(error)
                }else{
                    var d=ejs.render(data,{
                        gallery:result[0] //result가 한건의 데이터만 담고있다고 하더라도,배열이므로..
                        
                    });//ejs 렌더링해서 넣기
                    response.writeHead(200,{"Content-Type":"text/html; charset=utf-8"})
                    response.end(d);
                }
                con.end(); //mysql close
            });

        }
    })


})
//삭제 요청 처리  ( DB삭제 + 이미지삭제 ) 
//파일을 업로드 하건, 안하건 일단 multer를 사용하게 되면, 모든 post방식에 관여하게 되어있다..
//node.js...
app.post("/gallery/del",upload.single("pic") ,function(request, response){
    
    var gallery_id=request.body.gallery_id;
    var filename=request.body.filename;

    console.log("gallery_id", gallery_id);

    fs.unlink(__dirname+"/static/upload/"+filename, function(err){
        if(err){
            console.log("삭제실패", err);
        }else{
            console.log("삭제성공");
            //db도 지우자!!
            var sql="delete from gallery where gallery_id="+gallery_id;
            var con = mysql.createConnection(conStr);//접속 및 커넥션 객체 반환
            con.query(sql, function(error, fields){
                if(error){
                    console.log("삭제실패", error);
                }else{
                    //성공시 목록 요청!!
                    response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
                    response.end(mymodule.getMsgUrl("삭제완료","/gallery/list"));
                }
                con.end();
            });
        }
    });
    // var gallery_id=request.query.gallery_id //get방식의 파라미터 추출
    // var gallery_id=request.body.gallery_id; //post방식의 파라미터 추출
});

//수정 요청 처리(서버가 일단 업로드 컴포넌트를 사용하게 되면, post는 무조건 업로드 컴포넌트 이용해야함)
app.post("/gallery/edit", upload.single("pic"),function(request, response){
    var title=request.body.title;
    var writer=request.body.writer;
    var content=request.body.content;
    var filename=request.body.filename;//기존의 파일명
    var gallery_id=request.body.gallery_id;

    //클라이언트가 업로드를 원하는지 안하는지를 어떻게 구분?

    //업로드시, request객체의 json속성중 file 이라는 속성이 판단대상..
    // console.log("request.file", request.file);

    if(request.file!=undefined){//업로드를 원하는 것임(사진교체)
        console.log("사진도 교체합니다")
        //사진지우기+db수정
        fs.unlink(__dirname+"/static/upload/"+filename, function(err){
            if(err){
                console.log("삭제실패",err)
            }else{
                filename=request.file.filename;//새롭게 업로드된 파일명으로 교체
                var sql="update gallery set title=?, writer=?, content=?, filename=? where gallery_id=?";

                var con=mysql.createConnection(conStr);//mysql접속
                con.query(sql, [title,writer,content,filename,gallery_id], function(error, fields){
                    if(error){
                        console.log(error)
                    }else{
                        response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
                        response.end(mymodule.getMsgUrl("수정완료", "/gallery/detail?gallery_id="+gallery_id))
                    }
                    con.end();// mysql 접속해제
                });

            }
        });

    }else{//사진 유지
        console.log("사진을 유지합니다")
        var sql="update gallery set title=?, writer=?, content=? where gallery_id=?";
        var con=mysql.createConnection(conStr);
        con.query(sql,[title,writer,content,gallery_id],function(err,fields){
            if(err){
                console.log(err)
            }else{
                response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgUrl("수정완료", "/gallery/detail?gallery_id="+gallery_id))
            }
            con.end();// mysql 접속해제
        });

    }
    
});


// var server=http.createServer(express객체); 기본 모듈에 express모듈 연결
var server=http.createServer(app);
server.listen(9999, function(){ //9999포트로 서버생성
    console.log("Gallery Server is running at 9999 port...") // 서버가동 여부 확인용 콘솔 로그 찍기
});