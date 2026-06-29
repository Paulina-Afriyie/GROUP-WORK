$json = '{"product_name":"Test Update Fix","product_author":"Tester","product_price":"10.99","product_quantity_in_stock":"5","supplier_ID":"","category_ID":"","product_image":""}'
try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/admin/products/1' -Method Put -Body $json -ContentType 'application/json'
    Write-Host 'OK'
    $r | ConvertTo-Json -Depth 2 | Write-Host
} catch {
    Write-Host 'ERROR' $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host ($reader.ReadToEnd())
    }
}
