var ActiveDirectory = require('activedirectory');
require('dotenv').config();
var config = {
    url: process.env.URL,
    baseDN: process.env.BASE_DN,
    username: process.env.USER_NAME,
    password: process.env.PASSWORD
}

var ad = new ActiveDirectory(config);


var constructResult = function(){
    
	let object = {}
	object.auth = 'fail';
	object.validcreds = false;
    object.name =  '';
    object.samaccountname = '';
	object.groups = [];
    //object.ismemberofgroup = false
    return object;
}
var construcErrorMessage = function(){
    var object = {}
    object.auth = 'fail';
    object.message =  '';
    return object;
}
var auth = function (result,fullUsername,password,username) {
    return new Promise(function (resolve, reject) {
        //We try to authenticate the user with this func call
        ad.authenticate(fullUsername, password, function (err, auth) {

            //If there's an error, return the error object
            if (err) {
                reject(JSON.stringify(err))
            }

            //If auth is successful
            if (auth) {
                
                //set the relevant properties
                result.validcreds = true;
                result.samaccountname = username.toUpperCase()
				result.auth = 'success';
                resolve('success')

            }
            else {
            // If for some reason the auth fails
                reject('Authentication failed!')
            }
        });
    })
}



var searchUsr = function (result,username) {
    return new Promise(function (resolve, reject) {
        //find the user in AD
        ad.findUser(username, function (err, user) {
            if (err) {
                // console.log('ERROR: ' + JSON.stringify(err));
                reject(JSON.stringify(err));
            }

            if (!user) {
                //  console.log('User: ' + username + ' not found.');
                reject('User: ' + username + ' not found.')
            }
            else {
                //  console.log(JSON.stringify(user));
                usrDN = user.dn.split(',OU=')
                result.name = usrDN[0].replace('CN=', '').replace('\\', '')
                resolve('success')
            }
        });

    })
}
var groupMem = function (result,username) {
    return new Promise(function (resolve, reject) {
        ad.getGroupMembershipForUser(username, function (err, groups) {
            if (err) {
                //   console.log('ERROR: ' + JSON.stringify(err));
                reject('ERROR: ' + JSON.stringify(err))
            }

            if (!groups) {
                //   console.log('User: ' + username + ' not found.');
                reject('User: ' + username + ' not found.')
            }
			
			/*
			else{
				console.log(JSON.stringify(groups));
				resolve('success')
			}
			*/
			
            else {
                //console.log(JSON.stringify(groups));
                var grpName
                var found = 0
                groups.forEach(function (groupDN) {

                    grpName = groupDN.cn.split(',')

					console.log(grpName[0].replace('CN=', '').toUpperCase())
					result.groups.push(grpName[0].replace('CN=', '').toUpperCase())


                })
				resolve('success')
            } 
        });

    })
}






var express = require('express');

var app = express()
app.disable('etag');

var getResults = function(req,res,next){
	var result = constructResult();
    var errorMessage = construcErrorMessage();
	try{
	

	var username = req.param('userid');
    //var groupName = req.param('group');
    var password = req.param('password');
	
	console.log(`The SAMAAccountName is:  ${username}`)
	//console.log(`The group name is:  ${ groupName }`)
	if ( username == null ||  password == null || username == "" || password == "" ) {
		errorMessage.auth = 'fail'
		errorMessage.message = 'Please specify all the parameters '
		res.json(JSON.parse(JSON.stringify(errorMessage)))
		
		return;
	}
	
	var fullUsername =  username; // In some cases when there is are other trusted domains, you may need to add the domain name like this 'mydomain//' + username


    

	//We try to authenticate , searchUser in AD and get the users Group membership details all at once. This will fail even if one of the promises fail.
    Promise.all([auth(result,fullUsername,password,username), searchUsr(result,username), groupMem(result,username)]).then(function (resul) {
		res.statusCode = 200;
        res.json(JSON.parse(JSON.stringify(result)))
		
		next()
		
    }).catch(function (err) {
        console.log(err)
        errorMessage.message = err
        console.log(errorMessage)
		res.statusCode = 200;
		res.json(JSON.parse(JSON.stringify(errorMessage)))
		
		next()
		
    })
	}
	catch{
		errorMessage.message = "Something went wrong. Please contact the admin"
	}
	
}


app.use(getResults)
app.get('/', function(req,res){

	
    
})



app.listen(process.env.EXPRESS_PORT)