import * as bitcoin from 'bitcoinjs-lib' 
const bitcore = require('bitcore-lib');
const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
const bip32 = BIP32Factory(ecc)


export function createAddress(params: any):any {
    const {seedHex, receiveOrChange, addressIndex, network, method} = params
    const root = bip32.fromSeed(Buffer.from(seedHex, 'hex'))
    let path = "m/44'/0'/0'/0" + addressIndex + '';
    if (receiveOrChange === '1') {
        path = "m/44'/0'/0'/1" + addressIndex + '';
    }
    const child = root.derivePath(path)
    let address: string
    switch(method) {
        case 'p2pkh':
        const p2pkhAddress = bitcoin.payments.p2pkh({
            pubkey: child.publicKey,
            network: bitcoin.networks[network]
        })
        address = p2pkhAddress.address
        break;
        case 'p2wpkh':
        const p2wpkhAddress = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network: bitcoin.networks[network]
        })
        address = p2wpkhAddress.address
        break;
        case 'p2sh':
        const p2shAddress = bitcoin.payments.p2sh({
            pubkey: child.publicKey,
            network: bitcoin.networks[network]
        })
        address = p2shAddress.address
        break;
        default:
        console.log('This way can not support');
    }

    return {
        privateKey: Buffer.from(child.privateKey).toString('hex'),
        publicKey: Buffer.from(child.publicKey).toString('hex'),
        address
    }
}


export function createMultiSignAddress (params: any): string {
    const { pubkeys, network, method, threshold } = params;
    switch (method) {
      case 'p2pkh':
        return bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2ms({
            m: threshold,
            network: bitcoin.networks[network],
            pubkeys
          })
        }).address;
      case 'p2wpkh':
        return bitcoin.payments.p2wsh({
          redeem: bitcoin.payments.p2ms({
            m: threshold,
            network: bitcoin.networks[network],
            pubkeys
          })
        }).address;
      case 'p2sh':
        return bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wsh({
            redeem: bitcoin.payments.p2ms({
              m: threshold,
              network: bitcoin.networks[network],
              pubkeys
            })
          })
        }).address;
      default:
        console.log('This way can not support');
        return '0x00';
    }
}

export function buildAndSignTx (params: { privateKey: string, signObj: any, network: string}): string {
    const { privateKey, signObj, network } = params
    const net = bitcore.Networks[network]
    const inputs = signObj.inputs.map(input => {
        return {
            address: input.address,
            txId: input.txid,
            outputIndex: input.vout,
            script: new bitcore.Script.fromAddress(input.address).toHex(),
            satoshis: input.amount
        }
    })
    const outputs = signObj.outputs.map(output => {
        return {
            address: output.address,
            satoshis: output.amount
        }
    })

   const transaction = new bitcore.Transaction(net).from(inputs).to(outputs);
transaction.version = 2;
    transaction.sign(privateKey);
    return transaction.toString();
}

export function buildUnsignTxAndSign (params) {
    const { keyPair, signObj, network } = params;
    const psbt = new bitcoin.Psbt({ network });
    const inputs = signObj.inputs.map(input => {
      return {
        address: input.address,
        txId: input.txid,
        outputIndex: input.vout,
        // eslint-disable-next-line new-cap
        script: new bitcore.Script.fromAddress(input.address).toHex(),
        satoshis: input.amount
      };
    });
    psbt.addInput(inputs);
  
    const outputs = signObj.outputs.map(output => {
      return {
        address: output.address,
        satoshis: output.amount
      };
    });
    psbt.addOutput(outputs);
    psbt.toBase64();
  
    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();
  
    const signedTransaction = psbt.extractTransaction().toHex();
    console.log('signedTransaction==', signedTransaction);
  }
  