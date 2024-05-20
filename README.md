MAKAM
secara default berjapan pada port 5000, bisa disesuaikan pada saat pembuatan container.
database (mysql versi 5.7) ada di folder utama dengan nama makam.sql 

Build Image:
```
docker build -t makam .
```
Jalankan container:
```
docker run -v /directory-lokasi-public:/public -d -t -i -e DB_HOST='localhost' -e DB_USER='root' -e DB_PASSWORD='passwordnya' -e DB_NAME='makam' -e DB_PORT=3306 -p 5000:5000 --name nama_container makam
```


untuk updating:
```
docker cp ./src nama_container:/
docker exec -it nama_container npm install
docker exec -it nama_container pm2 reload all
```

untuk monitoring:
```
docker exec -it nama_container pm2 monit
```

untuk list process berjalan:
```
docker exec -it nama_container pm2 list
```
