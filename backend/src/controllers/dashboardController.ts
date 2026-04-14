import type { Request, Response } from 'express';
import { User, Transaction, UserSignal } from '../models/index.js';
import { Op } from 'sequelize';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    // Check if user exists
    const user: any = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const current_balance = user.wallet_balance || 0.0;

    // 1. Calculate trade stats
    const total_trades = await UserSignal.count({ where: { user_id } });
    const winning_trades = await UserSignal.count({ where: { user_id, result: 'win' } });
    const losing_trades = await UserSignal.count({ where: { user_id, result: 'loss' } });

    const week_ago = new Date();
    week_ago.setDate(week_ago.getDate() - 7);
    const trades_this_week = await UserSignal.count({
      where: {
        user_id,
        taken_at: { [Op.gte]: week_ago }
      }
    });

    // 2. Financial stats
    const total_deposit = await Transaction.sum('amount', { where: { user_id, type: 'deposit' } }) || 0.0;
    const total_withdrawal = await Transaction.sum('amount', { where: { user_id, type: 'deduction' } }) || 0.0;

    const total_balance = total_deposit;
    const total_profit = Math.max(0, current_balance - (total_deposit as number) + (total_withdrawal as number));
    const total_loss = total_withdrawal;

    let profit_percentage = 0, loss_percentage = 0, roi_percentage = 0;
    if ((total_deposit as number) > 0) {
      profit_percentage = (total_profit / (total_deposit as number)) * 100;
      loss_percentage = ((total_loss as number) / (total_deposit as number)) * 100;
      roi_percentage = ((current_balance - (total_deposit as number)) / (total_deposit as number)) * 100;
    }

    const total_transactions = await Transaction.count({ where: { user_id } });
    const deposit_transactions = await Transaction.count({ where: { user_id, type: 'deposit' } });
    const withdrawal_transactions = await Transaction.count({ where: { user_id, type: 'deduction' } });

    // 3. Recent transactions
    const recent_transactions = await Transaction.findAll({
      where: { user_id },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // 4. Profit/Loss overview (last 30 days)
    const profit_loss_overview: any[] = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const day_transactions = await Transaction.findAll({
            where: {
                user_id,
                created_at: {
                    [Op.and]: [
                        { [Op.gte]: new Date(date.setHours(0,0,0,0)) },
                        { [Op.lte]: new Date(date.setHours(23,59,59,999)) }
                    ]
                }
            }
        });

        const daily_profit = day_transactions.filter((t: any) => t.type === 'profit').reduce((sum: number, t: any) => sum + t.amount, 0);
        const daily_loss = day_transactions.filter((t: any) => t.type === 'deduction').reduce((sum: number, t: any) => sum + t.amount, 0);

        profit_loss_overview.push({
            date: dateStr,
            profit: daily_profit,
            loss: daily_loss
        });
    }

    const win_rate = total_trades > 0 ? (winning_trades / total_trades) * 100 : 0.0;
    const loss_rate = total_trades > 0 ? (losing_trades / total_trades) * 100 : 0.0;

    return res.status(200).json({
      stats: {
        current_balance,
        total_balance,
        total_deposit,
        total_withdrawal,
        total_profit,
        total_loss,
        profit_percentage,
        loss_percentage,
        roi_percentage,
        total_transactions,
        deposit_transactions,
        withdrawal_transactions,
        total_trades,
        winning_trades,
        losing_trades,
        win_rate,
        loss_rate,
        trades_this_week,
        recent_transactions
      },
      profit_loss_overview
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
