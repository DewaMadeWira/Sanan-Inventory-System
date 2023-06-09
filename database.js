import mysql from 'mysql2'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
    host:process.env.HOST,
    user:process.env.USER,
    password:process.env.PASSWORD,
    database:process.env.DB
}).promise()




async function getItem(id){
    const [result] = await pool.query("SELECT * FROM tb_barang where id= ?",[id])
    return result
}

async function insertItem(nama,stok,harga){
    const [result] = await pool.query("INSERT INTO tb_barang (nama,stok,harga) VALUES (?,?,?)",[nama,stok,harga])
    return result
}

async function getAllTransactions(){
    const [result]=await pool.query("SELECT * FROM tb_transaksi")
    return result
}

async function getTransaction(id){
    const [result] = await pool.query("SELECT * FROM tb_transaksi where id = ?", [id])
    return result
}


async function insertTransaction(id,qty){
    const [item] = await getItem(id)
    let {nama,stok}=item
    let updatedStok = () =>{
        if(qty<=stok){
            return stok-qty
        }
    }
    await pool.query("UPDATE tb_barang SET stok = ? where id = ?", [updatedStok(),id])
    await pool.query("INSERT INTO tb_transaksi (quantity,id_barang) VALUES (?,?)", [qty,id]) 
}

async function showAllTransactionDate(date){
    const item= await pool.query("SELECT SUM(quantity) FROM tb_transaksi where tanggal = ?",[date])
    console.log(item)
}

async function showTransactionItemDate(date,id){
    const [item]= await pool.query("SELECT SUM(quantity),id_barang FROM tb_transaksi where tanggal = ? AND id_barang = ?",[date,id])
    console.log(item)
}

// Get All tb_barang 
export async function getAllBarang(){
    const [result] = await pool.query("SELECT * FROM tb_barang")
    console.log(result)
    return result
  }


// Query Masukkan Barang Baru
export async function createBarangBaru(namaBarang,kategori,harga,barangImg,qrCodeImg){
    const [returnBarangMasuk] = await pool.query("INSERT INTO tb_barang (nama_barang,kategori,harga,barang_img,qrcode_img) VALUES (?,?,?,?,?)",[namaBarang,kategori,harga,barangImg,qrCodeImg])
    console.log(returnBarangMasuk)
    return returnBarangMasuk

}

// Update Add Path Barang
export async function updatePathBarang(idBarang,pathQR,pathImg){
    const [returnPath] = await pool.query("UPDATE tb_barang SET qrcode_img = ?, barang_img = ? where id = ?",[pathQR,pathImg,idBarang])
    console.log(returnPath)
}

   

// createBarangBaru("asd","asd",1000,"/asd","/asd")

// ===For Chart JS===

// Query Get Barang Keluar
export async function getBarangKeluarDate(){
    const [returnGetBarang]= await pool.query("SELECT * FROM tb_barang_keluar")
    // console.log(returnGetBarang[0])
    return returnGetBarang
}

// Scan QR Get Barang
export async function getBarangScan(idBarang){
    const [returnGetBarang]= await pool.query("SELECT * FROM tb_barang where id = ?",[idBarang])
    console.log(returnGetBarang[0])
    return returnGetBarang[0]
    
}

// Query Barang Masuk
export async function insertGudang(idBarang,qty,tglProduksi,tglMasuk){

    //  IF DUNNO TANGGAL PRODUKSI, GENERATE TANGGAL PRODUKSI - TANGGAL EXPIRED
    // Tanggal produksi form bisa diganti menjadi tanggal expired
    // NO Generated Insert 

    // === Expired Generator ===

    let tglExpired = generateExpired(tglProduksi)


    const [returnInsertGudangDate]= await pool.query("UPDATE tb_gudang SET quantity = quantity + ? where tanggal_expired = ? AND id_barang = ?",[qty,tglExpired,idBarang])
    console.log(returnInsertGudangDate)
    let {affectedRows} = returnInsertGudangDate
    console.log(affectedRows)
    



    if(affectedRows == 0){

    const [returnInsertGudang]= await pool.query("INSERT INTO tb_gudang (id_barang, quantity, tanggal_produksi, tanggal_expired) VALUES (?, ?, ?, ?)",[idBarang,qty,tglProduksi, tglExpired])
    
    // console.log(returnInsertGudang)

    // Insert to tb_barang_masuk
    const [returnInsertMasuk]= await pool.query("INSERT INTO tb_barang_masuk (id_gudang, quantity, tanggal_masuk,id_barang) VALUES (?, ?, ?, ?)",[returnInsertGudang.insertId,qty,tglMasuk, idBarang])

    // const [returnInsertMasuk]= await pool.query("INSERT INTO tb_barang_masuk (id_gudang, quantity, tanggal_masuk) VALUES (?, ?, ?, ?)",[returnInsertGudang.insertId,qty,getDateNow(), idBarang])
    console.log(returnInsertMasuk)
    }else{
        const [returnGetGudangDate]= await pool.query("SELECT * FROM tb_gudang where tanggal_expired = ? AND id_barang = ?",[tglExpired,idBarang])

        const [returnInsertMasukDate]= await pool.query("INSERT INTO tb_barang_masuk (id_gudang, quantity, tanggal_masuk,id_barang) VALUES (?, ?, ?, ?)",[returnGetGudangDate[0].id,qty,tglMasuk, idBarang])


        console.log(returnInsertMasukDate)
    }
}

// insertGudang(1,2,"2021-01-01","2021-03-02")

// Query Barang Keluar
export async function outGudang(idBarang,qty,tglExpired,tglKeluar){
    let status = false;
    // Get ID Barang Gudang
        const [returnGetItem]= await pool.query("SELECT * FROM tb_gudang where tanggal_expired = ? AND id_barang = ?",[tglExpired,idBarang])
        if(returnGetItem[0].quantity > 0){

        // Update Barang Gudang
        const [returnUpdateGudang]= await pool.query("UPDATE tb_gudang SET quantity = quantity - ? where tanggal_expired = ? AND id_barang = ?",[qty,tglExpired,idBarang])


        // Insert Barang Keluar

        const [returnBarangKeluar]= await pool.query("INSERT INTO tb_barang_keluar (id_gudang, quantity, tanggal_keluar, id_barang) VALUES (?, ?, ?, ?)",[returnGetItem[0].id , qty, tglKeluar, idBarang])

        // == Date Generated ==
        // const [returnBarangKeluar]= await pool.query("INSERT INTO tb_barang_keluar (id_gudang, quantity, tanggal, id_barang) VALUES (?, ?, ?, ?)",[returnGetItem[0].id , qty, getDateNow(), idBarang])
        // console.log(returnBarangKeluar)
        status= true
        return status
    }
    return status

}

// Delete Hanya Gudang
export async function deleteOnlyGudang(idGudang){
    await pool.query("SET foreign_key_checks = 0;")
    const [resultOnlyGudang] = await pool.query("DELETE FROM tb_gudang WHERE id = ?",[idGudang])
    console.log(resultOnlyGudang)
    await pool.query("SET foreign_key_checks = 1;")
}

// Delete Gudang dan Sekitarnya
export async function deleteGudangAll(idGudang){
    await pool.query("DELETE FROM tb_barang_masuk WHERE id_gudang = ?",[idGudang])
    await pool.query("DELETE FROM tb_barang_keluar WHERE id_gudang = ?",[idGudang])
    const [result]=await pool.query("DELETE FROM tb_gudang WHERE id = ?",[idGudang])
    console.log(result)
}
// deleteGudangAll(12)

// Delete Barang Masuk
export async function deleteBarangMasuk(idBarangMasuk){
    // const [resultGetBarangMasuk] = await pool.query("SELECT * FROM tb_gudang INNER JOIN tb_barang_masuk ON tb_gudang.id=tb_barang_masuk.id_gudang where tb_barang_masuk.id = ?",[idBarangMasuk])
    const [resultGetBarangMasuk] = await pool.query("SELECT * FROM tb_barang_masuk where id = ?",[idBarangMasuk])

    const [resultGetGudang] = await pool.query("SELECT * FROM tb_gudang where id = ?",[resultGetBarangMasuk[0].id_gudang])

    let newQuantity = resultGetGudang[0].quantity - resultGetBarangMasuk[0].quantity

    const [returnUpdateGudang]= await pool.query("UPDATE tb_gudang SET quantity = ? where id = ?",[newQuantity,resultGetBarangMasuk[0].id_gudang])
    // console.log(returnUpdateGudang)
    // console.log(resultGetBarangMasuk[0].quantity)

    //  Delete Query 
    await pool.query("DELETE FROM tb_barang_masuk WHERE id= ?",[idBarangMasuk])
    console.log(newQuantity)
}
// Delete Barang Keluar
export async function deleteBarangKeluar(idBarangKeluar){
    // const [resultGetBarangMasuk] = await pool.query("SELECT * FROM tb_gudang INNER JOIN tb_barang_masuk ON tb_gudang.id=tb_barang_masuk.id_gudang where tb_barang_masuk.id = ?",[idBarangMasuk])
    const [resultGetBarangKeluar] = await pool.query("SELECT * FROM tb_barang_keluar where id = ?",[idBarangKeluar])

    const [resultGetGudang] = await pool.query("SELECT * FROM tb_gudang where id = ?",[resultGetBarangKeluar[0].id_gudang])

    let newQuantity = resultGetGudang[0].quantity + resultGetBarangKeluar[0].quantity

    const [returnUpdateGudang]= await pool.query("UPDATE tb_gudang SET quantity = ? where id = ?",[newQuantity,resultGetBarangKeluar[0].id_gudang])
    // console.log(returnUpdateGudang)
    // console.log(resultGetBarangMasuk[0].quantity)
    await pool.query("DELETE FROM tb_barang_keluar WHERE id = ?",[idBarangKeluar])
    console.log(newQuantity)
}

// deleteBarangMasuk(15)
// deleteBarangKeluar(14)

// Utility Function Below

// Get Date Now
function getDateNow(){
    const date = new Date();

    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    let currentDate = `${year}-${month}-${day}`;
    return currentDate
}

// Generate Expired 
function generateExpired(tglProduksi){
    const date= new Date(tglProduksi)
    let month = date.getMonth() +1
    console.log("Month Before :" +month)
    month += 3
    date.setMonth(month)
    // console.log(date.getMonth())
    return (`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
}




// generateExpired("2023-03-19")

// insertGudang(1,2,"2023-06-19")
// outGudang("2023-09-19", 1,1)

// insertTransaction(1,3)


// showAllTransactionDate("2023-02-19")
// showTransactionItemDate("2023-02-19",1)

