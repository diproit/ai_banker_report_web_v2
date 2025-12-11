// common base url for entire application if there any .env file backend will be localhost 5003 else the backend URL wiull be https://testdb.aibanker.cloud/aireports. in other components you can use the BASE_URL constant to make API calls and endpoints in separate components
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://testdb.aibanker.cloud/aireports";

export default BASE_URL;


//need to add the url 