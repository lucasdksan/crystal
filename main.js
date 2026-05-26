const { generateReport } = require("./charts");
const { runKmeans } = require("./kmeans");
const { runSom } = require("./som");

// V1

function normalize(vectors) {
    const cols = vectors[0].length;
    const mins = Array(cols).fill(Infinity);
    const maxs = Array(cols).fill(-Infinity);

    vectors.forEach((row) => {
        row.forEach((value, i) => {
            mins[i] = Math.min(mins[i], value);
            maxs[i] = Math.max(maxs[i], value);
        });
    });

    return vectors.map((row) =>
        row.map((value, i) => {
            const range = maxs[i] - mins[i];

            if (range === 0) {
                return 0;
            }

            return (value - mins[i]) / range;
        })
    );
}

function buildSalesChannelMap(list) {
    const channels = [...new Set(list.map((order) => order.salesChannel).filter(Boolean))];

    return Object.fromEntries(channels.map((channel, index) => [channel, index]));
}

function getDataOrders(list) {
    const originMap = {
        Marketplace: 0,
    };

    const paymentMap = {
        Promissory: 0,
        "Boleto Bancário": 1,
        Dinheiro: 2,
        Pix: 3,
        "Cartão de Crédito": 4,
        "Cartão de Débito": 5,
        Visa: 6,
        Mastercard: 7,
        "American Express": 8,
        "Diners Club": 9,
        "Hipercard": 10,
        Aura: 11,
        Elo: 12,
        JCB: 13,
        Discover: 14,
    };

    const statusMap = {
        canceled: 0,
        pending: 1,
        success: 2,
        shipped: 3,
        delivered: 4,
        invoiced: 5,
        "payment-approved": 6,
        "payment-pending": 7,
        "ready-for-handling": 8,
        handling: 9,
        "window-to-cancel": 10,
        "waiting-for-sellers-confirmation": 11,
    };

    const salesChannelMap = buildSalesChannelMap(list);

    return list.map((order) => {
        const creationDate = new Date(order.creationDate);

        return {
            orderId: order.orderId,
            clientName: order.clientName,
            creationDate: order.creationDate,
            items: order.items.map((item) => ({
                quantity: item.quantity,
                price: item.price,
                sellingPrice: item.sellingPrice,
                description: item.description,
                productId: item.productId,
                seller: item.seller,
            })),
            totalValue: order.totalValue,
            totalItems: order.totalItems,
            origin: originMap[order.origin] ?? -1,
            paymentNames: paymentMap[order.paymentNames] ?? -1,
            status: statusMap[order.status] ?? -1,
            statusRaw: order.status,
            paymentRaw: order.paymentNames,
            originRaw: order.origin,
            hourOfDay: creationDate.getHours(),
            dayOfWeek: creationDate.getDay(),
            salesChannel: salesChannelMap[order.salesChannel] ?? -1,
            salesChannelRaw: order.salesChannel,
            workflowInErrorState: order.workflowInErrorState ? 1 : 0,
            isAllDelivered: order.isAllDelivered ? 1 : 0,
        };
    });
}

function orderToVector(order) {
    const totalQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const avgPrice =
        order.items.length > 0
            ? order.items.reduce((acc, item) => acc + item.sellingPrice, 0) / order.items.length
            : 0;

    return [
        order.totalValue,
        order.totalItems,
        totalQuantity,
        avgPrice,
        order.origin,
        order.paymentNames,
        order.hourOfDay,
        order.dayOfWeek,
        order.salesChannel,
    ];
}

async function main() {
    const url = "https://agencian1.myvtex.com/"	
    const headers = {
        "Content-Type": "application/json",
        "X-VTEX-API-AppKey": "vtexappkey-agencian1-HRURPP",
        "X-VTEX-API-AppToken": "RUUWGIABQTLMDETDAJQDXLWNGJHQAPNFYECFPJFRMSSKIDIHXAUBVEEFXGQWBKAAFGNYCONRDZQETMFCBZSAVLKUAXIJSIPCSRECPJFJMDYWNZMLBNVCRAFUWTYFFEYU",
    };

    const data = await fetch(`${url}api/oms/pvt/orders?_items=1`, { headers });
    const json = await data.json();
    const { list } = json;

    if (!list || list.length === 0) {
        console.log("Nenhum pedido encontrado.");
        return;
    }

    const orders = getDataOrders(list);
    const vectors = orders.map(orderToVector);
    const normalizedVectors = normalize(vectors);
    const { result, elbowAnalysis, bestK } = runKmeans(normalizedVectors);
    const somResult = runSom(normalizedVectors);

    console.log("Análise Elbow (WCSS):", elbowAnalysis);
    console.log("K ótimo selecionado:", bestK);

    console.log("\nCLUSTERS:\n");

    result.clusters.forEach((clusterId, index) => {
        console.log({
            cluster: clusterId,
            order: orders[index],
        });
    });

    console.log("\nCENTROIDS:\n");
    console.log(result.centroids);

    console.log("\nSOM - Mapa de similaridade:\n");
    console.log(somResult.predictions);

    generateReport({
        orders,
        rawList: list,
        result,
        elbowAnalysis,
        bestK,
        somResult,
    });
}

main();
