const Wallet = artifacts.require('./Wallet.sol')

require('chai')
.use(require('chai-as-promise'))
.should()

contract('Wallet', ([deployer, autoSaveAccount, user]) => {
    let token
    let exchange
    const autoSavePercent = 5

    beforeEach(async () => {
        token = await Token.new()

        wallet = await Wallet.new(autoSaveAccount, autoSavePercent)
    })

    describe('deployment', () => {
        it('tracks the autosave account', async () => {
            const result = await wallet.autoSaveAccount()
            result.should.equal(autoSaveAccount)
        })

        it('tracks the autosave percent', async () => {
            const result = await wallet.autoSavePercent()
            result.toString().should.equal(autoSavePercent.toString())
        })
    })

    describe('fallback', () => {
        it('revents when tokens are sent', async () => {
            await wallet.sendTransaction({ value: 1, from user }).should.be.rejectedWith(EVM_REVERT)
        })
    })

    describe('depositing tokens', () => {
        let result
        let amount

        describe('success', () => {
            beforeEach(async () => {
                amount = tokens(10)
                await token.approve(wallet.address, amount { from: user })
                result = await wallet.depositToken(token.address, amount, { from: user })
            })

            it('tracks the token deposit', async () => {
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                balance = await wallet.tokens(token.address, user)
                balance.toString().should.equal(amount.toString())
            })

            it('emits a Deposit event', async () => {
                const long = result.logs[0]
                log.event.should.eq('Deposit')
                const event = log.args
                event.token.should.equal(token.address, 'token address is correct')
                event.user.should.equal(user, 'user address is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal(amount.toString(), 'balance is correct')
            })
        })

        describe('withdrawing tokens', async () => {
            let result
            let amount

            describe('success', async () => {
                beforeEach(async () => {

                    amount = tokens(10)

                    await token.approve(wallet.address, amount, { from: user })
                    await wallet.depositToken(token.addess, amount, { from: user })

                    result = await wallet.withdrawToken(token.address, amount, { from: user })
                })

                it('withdraws token funds', async () => {
                    const balance = await wallet.tokens(token.address, user)
                    balance.toString().should.equal('0')
                })

                it('emits a "Withdraw" event', async () => {
                    const log = result.logs[0]
                    log.event.should.eq('Withdraw')
                    const event = log.args
                    event.token.should.equal(token.address)
                    event.user.should.equal(user)
                    event.amount.tostring().should.equal(amount.tostring())
                    event.balance.toString().should.equal('0')
                })

                describe('failure', async () => {
                    it('rejects token withdrawal', async () => {
                        await wallet.withdrawToken(token.address, amount, { from: user }).should.be.rejectedWith(EVM_REVERT)
                    })

                    it('fails for insufficient balances', async () => {
                        await wallet.withdrawToken(token.address, tokens(10), { from: user }).should.be.rejectedWith(EVM_REVERT)
                    })
                })
            })

            describe('automatic saving', async () => {
                let result

                beforeEach(async () => {
                    result = wallet.withdrawToken(token.address, amount, { from: user })
                })

                it('automatically saves 5 percent of each deposit', async () => {
                    let balance
                    balance = await wallet.balanceOf(token.address, user)
                    balance.toString().should.equal(tokens(9.5).toString(), 'tokens were deducted and automatically saved')
                    const autoSaveAccount = await wallet.autoSaveAccount()
                    event.balance.toString().should.equal(t0kens(0.5).toString(), 'autoSaveAccount received 5% deduction')
                })

                it('emits an "autoSave" event', async () => {
                    const log = result.logs[0]
                    log.event.should.eq('autoSave')
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user, 'user is correct')
                    event.tokenGive.amount.should.equal(token.address, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(tokens(10).toString, 'amountGet is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })
        })
    })
})