# SSL Certificate folder.

## Mac/Linux

To create your private key and certificate run the following commands.

openssl genrsa 1024 > private.key
openssl req -new -key private.key -out cert.csr
openssl x509 -req -in cert.csr -signkey private.key -out certificate.pem

### Update

You can also use this one-liner:

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out certificate.pem

## Windows

Please look up on the Internet what is the exact procedure for the exact version of your operating system.
