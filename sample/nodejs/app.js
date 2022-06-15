// TODO add Fiserv copyright, etc. heading

const axios = require('axios').default;
const CryptoJS = require('crypto-js')
const Base64 = require('crypto-js/enc-base64');

const CHARGES_BASE_URL = "https://cert.api.fiservapps.com/ch/payments/v1/charges"

// TODO replace these placeholders with the API Key and secret obtained at developer.fiserv.com
const key = "<YOUR API KEY HERE>"
const secret = "<YOUR SECRET HERE>"

// Generate the authorization header value (i.e. transaction signature)
function getSignature(key, secret, data, time, clientRequestId) {
  var rawSignature = key + clientRequestId + time + JSON.stringify(data);

  var computedHash = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secret.toString());
  computedHash.update(rawSignature);
  computedHash = computedHash.finalize();
  var computedHmac = CryptoJS.enc.Base64.stringify(computedHash)

  return computedHmac
}

// Here's the payload for the Charge request
const chargeData = {
	"amount": {
		"total": 5,
		"currency": "USD"
	},
	"source": {
		"sourceType": "PaymentTrack",
		"encryptionData": {
			"encryptionType": "ON_GUARD",
			"encryptionTarget": "TRACK_2",
			"encryptionBlock": "4614507291879694=078443325742854",
			"keyId": "FFFF109700000E4000340114",
			"deviceType": "INGENICO"
		},
		"pinBlock": {
			"encryptedPin": "0FF7A610CC84CE40",
			"keySerialNumber": "FFFF3D3D3D00232002C9"
		}
	},
	"transactionDetails": {
		"captureFlag": true
	},
	"transactionInteraction": {
		"origin": "POS",
		"posEntryMode": "MAG_STRIPE",
		"posConditionCode": "CARD_PRESENT",
		"terminalTimestamp": "2022-03-10T04:26:56Z",
		"additionalPosInformation": {
			"dataEntrySource": "MOBILE_TERMINAL",
			"posFeatures": {
				"pinAuthenticationCapability": "CAN_ACCEPT_PIN",
				"terminalEntryCapability": "MAG_STRIPE_MANUAL_CHIP"
			}
		}
	},
	"merchantDetails": {
		"merchantId": "100009000000035",
		"terminalId": "10000002"
	},
	"additionalDataCommon": {
		"directedRouting": {
			"processors": [{
				"code": "NASHVILLE",
				"platform": "NORTH",
				"priority": "PRIMARY"
			}]
		}
	}
}

// Here's the payload for the Cancel request
const cancelData = {
  "amount": {
    "total": 5,
    "currency": "USD"
  },
  "merchantDetails": {
		"merchantId": "100009000000035",
		"terminalId": "10000002"
  }
}

function doCancel(transactionId) {

	console.log("Performing Cancel transaction")

	var time = new Date().getTime()
	var clientRequestId = (Math.random() * 10000000) + 1
	var signature = getSignature(key, secret, cancelData, time, clientRequestId)

	var headers = {
		'Accept' : 'application/json',
		'Content-Type': 'application/json',
		'Accept-language' : 'en',
		'Auth-Token-Type' : 'HMAC',
		'Timestamp' : time,
		'Api-Key' : key,
		'Client-Request-Id' : clientRequestId,
		'Authorization': signature,
	}

	var cancel_url = CHARGES_BASE_URL + "/" + transactionId + "/cancel"
	console.log("Cancel URL is", cancel_url)
	axios.post(cancel_url, cancelData, {
			headers:headers
		})
		.then((response) => {
				//console.log(response)
				transactionId = response.data.gatewayResponse.transactionProcessingDetails.transactionId
				console.log("Cancel was successful. Transaction Id is", transactionId)
		})
		.catch(err => {
				console.log("Error performing cancel", err.response);
		})
}

function doCharge() {

	console.log("Performing Charge transaction")

	var time = new Date().getTime()
	var clientRequestId = (Math.random() * 10000000) + 1
	var signature = getSignature(key, secret, chargeData, time, clientRequestId)
	var transactionId = ""

	var headers = {
	  'Accept' : 'application/json',
	  'Content-Type': 'application/json',
	  'Accept-language' : 'en',
	  'Auth-Token-Type' : 'HMAC',
	  'Timestamp' : time,
	  'Api-Key' : key,
	  'Client-Request-Id' : clientRequestId,
	  'Authorization': signature,
	}

	// Perform the authorization
	axios.post(CHARGES_BASE_URL, chargeData, {
	  	headers:headers
	  })
	  .then((response) => {
	      //console.log(response)
				transactionId = response.data.gatewayResponse.transactionProcessingDetails.transactionId
				console.log("Charge was successful.  Transaction Id is", transactionId)

				// Cancel that auth
				doCancel(transactionId)
		  })
		  .catch(err => {
		      console.log("Error performing charge transaction", err.response);
		  })
}

// Vefify that API Key and secret have been provided
if( key === "<YOUR API KEY HERE>" || secret === "<YOUR SECRET HERE>") {
  console.log("Please replace the API Key and secret with the values obtained at developer.fiserv.com")
  process.exit(1);
}

// Perform a charge and then an immediate cancel
doCharge()
